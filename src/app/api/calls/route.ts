import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { calls, candidates, campaigns } from "@/db/schema";
import { getOrCreateDefaultAgent } from "@/lib/hunar/ensure-agent";
import { hunar, HunarApiError } from "@/lib/hunar/client";
import { E164_REGEX } from "@/lib/phone";

const createCallSchema = z.object({
  candidateId: z.string().uuid(),
  purpose: z.enum(["HIRING_SCREEN", "TALENT_REACHOUT"]),
  campaignId: z.string().uuid().optional(),
  /** Allow overriding the candidate's on-file number for the call — seeded demo
   *  profiles use fictional numbers and must be replaced with a real, consented one. */
  phoneOverride: z.string().min(6).optional(),
});

function appBaseUrl() {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL is not set");
  return base.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const campaignId = req.nextUrl.searchParams.get("campaignId");

  const rows = await db.query.calls.findMany({
    where: campaignId ? eq(calls.campaignId, campaignId) : undefined,
    orderBy: [desc(calls.createdAt)],
    with: { candidate: true },
  });

  return NextResponse.json({ calls: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const json = await req.json();
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

  const campaign = campaignId
    ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) })
    : null;

  const agent = await getOrCreateDefaultAgent(purpose);

  const phone = phoneOverride ?? candidate.phone;
  if (!E164_REGEX.test(phone)) {
    return NextResponse.json(
      { error: "Phone number must be in E.164 format: + followed by country code and number, e.g. +917411771293" },
      { status: 422 }
    );
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

  const base = appBaseUrl();
  const webhookUrl = `${base}/api/webhooks/hunar`;

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
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(calls.id, callRow.id));

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
