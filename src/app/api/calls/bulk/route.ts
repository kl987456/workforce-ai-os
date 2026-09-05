import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { calls, candidates, campaigns } from "@/db/schema";
import { getOrCreateDefaultAgent } from "@/lib/hunar/ensure-agent";
import { hunar, HunarApiError } from "@/lib/hunar/client";
import { E164_REGEX } from "@/lib/phone";
import { getWebhookCallbackUrl, InvalidCallbackUrlError } from "@/lib/hunar/callback-url";
import type { HunarCall } from "@/lib/hunar/types";

const bulkCallSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1, "Select at least one candidate"),
  campaignId: z.string().uuid(),
});

type SkipReason = { candidateId: string; reason: string };

export async function POST(req: NextRequest) {
  const db = getDb();
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bulkCallSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { campaignId } = parsed.data;
  // Dedupe in case the client sends the same id twice — keeps candidate->call-row
  // pairing below one-to-one.
  const candidateIds = Array.from(new Set(parsed.data.candidateIds));

  // Same HTTPS callback validation as the single-call route (factored into a shared
  // helper) — fail the whole batch fast rather than inserting rows we can't resolve.
  let webhookUrl: string;
  try {
    webhookUrl = getWebhookCallbackUrl();
  } catch (err) {
    if (err instanceof InvalidCallbackUrlError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const candidateRows = await db.query.candidates.findMany({
    where: inArray(candidates.id, candidateIds),
  });
  const candidateById = new Map(candidateRows.map((c) => [c.id, c]));

  const skipped: SkipReason[] = [];
  const valid: Array<{ candidate: (typeof candidateRows)[number]; phone: string }> = [];

  for (const candidateId of candidateIds) {
    const candidate = candidateById.get(candidateId);
    if (!candidate) {
      skipped.push({ candidateId, reason: "Candidate not found" });
      continue;
    }
    if (candidate.campaignId !== campaignId) {
      skipped.push({ candidateId, reason: "Candidate does not belong to this campaign" });
      continue;
    }
    if (!E164_REGEX.test(candidate.phone)) {
      skipped.push({
        candidateId,
        reason: `Phone "${candidate.phone}" is not in E.164 format (+ country code, e.g. +917411771293)`,
      });
      continue;
    }
    valid.push({ candidate, phone: candidate.phone });
  }

  if (valid.length === 0) {
    return NextResponse.json({ placed: 0, skipped });
  }

  const agent = await getOrCreateDefaultAgent("TALENT_REACHOUT");

  const insertedRows = await db
    .insert(calls)
    .values(
      valid.map(({ candidate }) => ({
        candidateId: candidate.id,
        agentId: agent.id,
        campaignId: campaign.id,
        status: "NOT_STARTED" as const,
      }))
    )
    .returning();

  const rowByCandidateId = new Map(insertedRows.map((row) => [row.candidateId, row]));

  try {
    const result = await hunar.calls.createBulk({
      agent_id: agent.hunarAgentId,
      data: valid.map(({ candidate, phone }) => ({
        callee_name: candidate.name,
        mobile_number: phone,
        // Our local calls.id, per row — lets the webhook route match deliveries back
        // to the right call even if this bulk response only returns a created count.
        request_id: rowByCandidateId.get(candidate.id)!.id,
        custom_data: {
          role_title: candidate.roleTitle ?? campaign.title ?? "the role",
          company: candidate.company ?? "our company",
          key_skills: (candidate.skills ?? []).join(", "),
        },
      })),
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

    if (Array.isArray(result)) {
      const hunarCallByRequestId = new Map(
        result.map((hc: HunarCall) => [hc.request_id ?? undefined, hc])
      );
      await Promise.all(
        insertedRows.map((row) => {
          const hunarCall = hunarCallByRequestId.get(row.id);
          return db
            .update(calls)
            .set({
              hunarCallId: hunarCall?.id,
              status: (hunarCall?.status as typeof calls.$inferSelect.status) ?? "INITIATED",
              lifecycleStatus: hunarCall?.lifecycle_status,
              updatedAt: new Date(),
            })
            .where(eq(calls.id, row.id));
        })
      );
    } else {
      // Bulk endpoint returned only a count, no per-call ids. The calls were still
      // created with our request_id (== calls.id) on each row, so webhook delivery
      // still resolves to the right row via the request_id match in
      // /api/webhooks/hunar — mark them INITIATED without a hunarCallId for now.
      await db
        .update(calls)
        .set({ status: "INITIATED", updatedAt: new Date() })
        .where(
          inArray(
            calls.id,
            insertedRows.map((r) => r.id)
          )
        );
    }

    return NextResponse.json({ placed: insertedRows.length, skipped }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof HunarApiError ? err.message : "Failed to place bulk call via Hunar";
    await db
      .update(calls)
      .set({ status: "FAILED", errorMessage: message, updatedAt: new Date() })
      .where(
        inArray(
          calls.id,
          insertedRows.map((r) => r.id)
        )
      );

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
