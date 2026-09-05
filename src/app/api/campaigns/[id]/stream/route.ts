import { NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, candidates, calls } from "@/db/schema";

// Long-lived SSE connection — request a generous execution budget. Vercel Fluid
// Compute (Node.js runtime) streams natively, so no edge runtime is needed here.
export const maxDuration = 300;

const idSchema = z.string().uuid();

// How often we re-check the DB for changes and (if anything moved) push an event.
const POLL_INTERVAL_MS = 2000;
// Cleanly end the stream well under Vercel's max function duration so we close
// on our own terms instead of being killed mid-write. A native EventSource
// reconnects automatically once the server ends the connection, so this is a
// deliberate, safe reset — not a bug.
const MAX_STREAM_DURATION_MS = 4 * 60 * 1000;

/** Mirrors the query in GET /api/campaigns/[id] so the stream reflects the same shape. */
async function loadCampaignPayload(db: ReturnType<typeof getDb>, id: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign) return null;

  const [candidateRows, callRows] = await Promise.all([
    db.query.candidates.findMany({
      where: eq(candidates.campaignId, id),
      orderBy: (c, { desc }) => [desc(c.matchScore)],
    }),
    db.query.calls.findMany({
      where: eq(calls.campaignId, id),
      orderBy: [desc(calls.createdAt)],
      with: { candidate: true },
    }),
  ]);

  return { campaign, candidates: candidateRows, calls: callRows };
}

type CampaignStreamPayload = NonNullable<Awaited<ReturnType<typeof loadCampaignPayload>>>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return new Response(JSON.stringify({ error: "Invalid campaign id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = getDb();

  const initialPayload = await loadCampaignPayload(db, id);
  if (!initialPayload) {
    return new Response(JSON.stringify({ error: "Campaign not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  // Seed with what we already fetched so the first tick doesn't immediately
  // re-send data the client is very likely to already have.
  let lastSerialized: string | null = JSON.stringify(initialPayload);

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearTimeout(endTimer);
      };

      const closeStream = () => {
        if (closed) return;
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed (e.g. client disconnected concurrently) — ignore.
        }
      };

      const tick = async () => {
        if (closed) return;
        let payload: CampaignStreamPayload | null;
        try {
          payload = await loadCampaignPayload(db, id);
        } catch {
          // Transient DB/network hiccup — skip this tick and retry on the next one.
          return;
        }
        if (closed) return;
        if (!payload) {
          // Campaign was deleted mid-stream; nothing left to report.
          closeStream();
          return;
        }
        const serialized = JSON.stringify(payload);
        if (serialized !== lastSerialized) {
          lastSerialized = serialized;
          try {
            controller.enqueue(encoder.encode(`data: ${serialized}\n\n`));
          } catch {
            closeStream();
          }
        }
      };

      const interval = setInterval(tick, POLL_INTERVAL_MS);
      const endTimer = setTimeout(closeStream, MAX_STREAM_DURATION_MS);

      req.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
