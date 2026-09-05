import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { calls, campaigns, candidates } from "@/db/schema";

/**
 * Once a Talent Search reachout call comes back with a result, the sourced
 * candidate should show up in the Hiring Assistant pipeline for that role
 * automatically — mirrors the manual "drag candidate onto a requisition"
 * flow in hiring-pipeline-panel.tsx, but driven by the webhook instead of a
 * recruiter's drag-and-drop, and carrying the call's result along with them.
 *
 * Idempotent: re-running for the same call (e.g. a later webhook delivery
 * refining the result) updates the previously-synced candidate row instead
 * of creating a duplicate.
 */
export async function syncReachoutResultToHiringPipeline(callId: string) {
  const db = getDb();

  const call = await db.query.calls.findFirst({
    where: eq(calls.id, callId),
    with: { candidate: true, agent: true, campaign: true },
  });
  if (!call) return;
  if (call.agent.purpose !== "TALENT_REACHOUT") return;
  if (!call.campaign || call.campaign.kind !== "TALENT_SEARCH") return;
  if (!call.result || Object.keys(call.result).length === 0) return;

  const source = call.candidate;
  const talentCampaign = call.campaign;

  const hiringCampaign =
    (await db.query.campaigns.findFirst({
      where: and(eq(campaigns.kind, "HIRING"), eq(campaigns.title, talentCampaign.title)),
    })) ??
    (
      await db
        .insert(campaigns)
        .values({
          kind: "HIRING",
          title: talentCampaign.title,
          location: talentCampaign.location,
          jobDescription: talentCampaign.jobDescription,
        })
        .returning()
    )[0];

  const existingSynced = await db.query.candidates.findFirst({
    where: and(eq(candidates.sourceCallId, call.id), eq(candidates.source, "REACHOUT_SYNC")),
  });

  const profile = {
    ...(typeof source.profile === "object" && source.profile ? source.profile : {}),
    reachoutResult: call.result,
  };

  if (existingSynced) {
    await db
      .update(candidates)
      .set({ profile })
      .where(eq(candidates.id, existingSynced.id));
    return existingSynced.id;
  }

  const [created] = await db
    .insert(candidates)
    .values({
      campaignId: hiringCampaign.id,
      name: source.name,
      email: source.email,
      phone: source.phone,
      roleTitle: source.roleTitle ?? hiringCampaign.title,
      company: source.company,
      location: source.location,
      yearsExperience: source.yearsExperience,
      skills: source.skills,
      source: "REACHOUT_SYNC",
      profile,
      sourceCallId: call.id,
      sourceCandidateId: source.id,
    })
    .returning();

  return created.id;
}
