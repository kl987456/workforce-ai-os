import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, and, notInArray } from "drizzle-orm";
import { getDb } from "@/db";
import { agents, calls, candidates, campaigns } from "@/db/schema";
import { getOrCreateDefaultAgent } from "@/lib/hunar/ensure-agent";
import { hunar, HunarApiError } from "@/lib/hunar/client";
import { E164_REGEX } from "@/lib/phone";
import { getWebhookCallbackUrl, InvalidCallbackUrlError } from "@/lib/hunar/callback-url";

const TERMINAL_CALL_STATUSES: (typeof calls.$inferSelect)["status"][] = [
  "COMPLETED",
  "NOT_CONNECTED",
  "FAILED",
  "CANCELLED",
];

const createCallSchema = z.object({
  candidateId: z.string().uuid(),
  purpose: z.enum(["HIRING_SCREEN", "TALENT_REACHOUT"]),
  campaignId: z.string().uuid().optional(),
  /** Allow overriding the candidate's on-file number for the call — seeded demo
   *  profiles use fictional numbers and must be replaced with a real, consented one. */
  phoneOverride: z.string().min(6).optional(),
});

export async function GET(req: NextRequest) {
  const db = getDb();
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (campaignId && !z.string().uuid().safeParse(campaignId).success) {
    return NextResponse.json({ error: "Invalid campaignId" }, { status: 400 });
  }

  const rows = await db.query.calls.findMany({
    where: campaignId ? eq(calls.campaignId, campaignId) : undefined,
    orderBy: [desc(calls.createdAt)],
    with: { candidate: true },
  });

  return NextResponse.json({ calls: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createCallSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { candidateId, purpose, campaignId, phoneOverride } = parsed.data;

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.id, candidateId),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Guard against placing two real, simultaneous outbound calls to the same candidate
  // (double-click, duplicate tab, client retry) — reject instead of racing to insert.
  const activeCall = await db.query.calls.findFirst({
    where: and(
      eq(calls.candidateId, candidate.id),
      notInArray(calls.status, TERMINAL_CALL_STATUSES)
    ),
  });
  if (activeCall) {
    return NextResponse.json(
      { error: "This candidate already has a call in progress. Wait for it to finish before placing another." },
      { status: 409 }
    );
  }

  let campaign = null;
  if (campaignId) {
    campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (candidate.campaignId !== campaignId) {
      return NextResponse.json(
        { error: "Candidate does not belong to this campaign" },
        { status: 400 }
      );
    }
  }

  let agent: Awaited<ReturnType<typeof getOrCreateDefaultAgent>>;
  try {
    // A campaign with a customized agent (screening questions + voice persona) uses
    // that specific agent instead of the shared default for its purpose. Fall back
    // to the default when the campaign never customized one (or has no campaign).
    const customAgent = campaign?.agentId
      ? await db.query.agents.findFirst({ where: eq(agents.id, campaign.agentId) })
      : null;
    agent = customAgent ?? (await getOrCreateDefaultAgent(purpose));
  } catch (err) {
    const message = err instanceof HunarApiError ? err.message : "Failed to set up the Hunar voice agent";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const phone = phoneOverride ?? candidate.phone;
  if (!E164_REGEX.test(phone)) {
    return NextResponse.json(
      { error: "Phone number must be in E.164 format: + followed by country code and number, e.g. +917411771293" },
      { status: 422 }
    );
  }

  let webhookUrl: string;
  try {
    webhookUrl = getWebhookCallbackUrl();
  } catch (err) {
    if (err instanceof InvalidCallbackUrlError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const [callRow] = await db
    .insert(calls)
    .values({
      candidateId: candidate.id,
      agentId: agent.id,
      campaignId: campaign?.id,
      status: "NOT_STARTED",
    })
    .returning();

  try {
    const hunarCall = await hunar.calls.create({
      agent_id: agent.hunarAgentId,
      callee_name: candidate.name,
      mobile_number: phone,
      request_id: callRow.id,
      custom_data: {
        role_title: candidate.roleTitle ?? campaign?.title ?? "the role",
        company: candidate.company ?? "our company",
        key_skills: (candidate.skills ?? []).join(", "),
      },
      guardrails: {
        allowed_days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        earliest_call_time: "08:00",
        last_call_time: "21:00",
      },
      retry_config: {
        max_retry_count: 1,
        retry_interval_hours: 3,
      },
      callback_config: {
        call_status_callback_url: webhookUrl,
        call_recording_callback_url: webhookUrl,
        call_result_callback_url: webhookUrl,
        call_summary_callback_url: webhookUrl,
      },
    });

    const [updated] = await db
      .update(calls)
      .set({
        hunarCallId: hunarCall.id,
        // Mirrors what's actually sent to Hunar as request_id (our own call row id) —
        // was previously left NULL forever despite the column existing.
        requestId: callRow.id,
        status: (hunarCall.status as typeof calls.$inferSelect.status) ?? "INITIATED",
        lifecycleStatus: hunarCall.lifecycle_status,
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callRow.id))
      .returning();

    return NextResponse.json({ call: updated }, { status: 201 });
  } catch (err) {
    const message = err instanceof HunarApiError ? err.message : "Failed to place call via Hunar";
    await db
      .update(calls)
      .set({ status: "FAILED", errorMessage: message, updatedAt: new Date() })
      .where(eq(calls.id, callRow.id));

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
