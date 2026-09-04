import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { calls, webhookEvents } from "@/db/schema";
import { verifyHunarWebhookSignature } from "@/lib/hunar/webhook";
import type { HunarWebhookPayload } from "@/lib/hunar/types";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hunar-signature");
  const timestampHeader = req.headers.get("x-hunar-timestamp");

  const apiKey = process.env.HUNAR_API_KEY;
  const signatureValid = apiKey
    ? verifyHunarWebhookSignature({
        signatureHeader,
        timestampHeader,
        rawBody,
        trustedApiKeys: [apiKey],
      })
    : false;

  let payload: HunarWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = getDb();

  await db.insert(webhookEvents).values({
    eventType: payload.event_type,
    callId: payload.call_id,
    requestId: payload.request_id ?? null,
    signatureValid,
    payload: payload as unknown as Record<string, unknown>,
  });

  // Reject only after logging, so unverifiable deliveries are still visible for debugging.
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const updates: Partial<typeof calls.$inferInsert> = { updatedAt: new Date() };

  if (payload.status) updates.status = payload.status as typeof calls.$inferSelect.status;
  if (payload.lifecycle_status) updates.lifecycleStatus = payload.lifecycle_status;
  if (payload.answered_by) updates.answeredBy = payload.answered_by;
  if (typeof payload.retry_count === "number") updates.retryCount = payload.retry_count;
  if (typeof payload.duration_seconds === "number") updates.durationSeconds = payload.duration_seconds;
  if (payload.started_at) updates.startedAt = new Date(payload.started_at);
  if (payload.ended_at) updates.endedAt = new Date(payload.ended_at);
  if (payload.recording_url) updates.recordingUrl = payload.recording_url;
  if (payload.result) updates.result = payload.result;

  // Match by our request_id (== our calls.id) first — it's set on every call we create —
  // falling back to hunar_call_id for deliveries where only that is populated.
  const matchColumn = payload.request_id ? calls.id : calls.hunarCallId;
  const matchValue = payload.request_id ?? payload.call_id;

  if (matchValue) {
    await db.update(calls).set(updates).where(eq(matchColumn, matchValue));
  }

  return NextResponse.json({ ok: true });
}
