import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agents, calls, candidates } from "@/db/schema";
import type { CandidateDTO, CallDTO, TimelineEvent } from "@/components/workforce/types";

type CandidateRow = typeof candidates.$inferSelect;
type CallRow = typeof calls.$inferSelect & { agent: typeof agents.$inferSelect | null };

function sourcedLabel(source: CandidateRow["source"]) {
  switch (source) {
    case "REACHOUT_SYNC":
      return "Synced to Hiring pipeline from a completed Talent Search reachout call";
    case "SEEDED_SEARCH":
      return "Sourced from Talent Search";
    default:
      return "Added manually";
  }
}

function toCandidateDTO(row: CandidateRow): CandidateDTO {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    roleTitle: row.roleTitle,
    company: row.company,
    location: row.location,
    yearsExperience: row.yearsExperience,
    skills: row.skills,
    matchScore: row.matchScore,
    source: row.source,
    profile: row.profile as CandidateDTO["profile"],
    sourceCallId: row.sourceCallId,
    sourceCandidateId: row.sourceCandidateId,
    isFavorite: row.isFavorite,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCallDTO(row: CallRow, candidate: CandidateDTO): CallDTO {
  return {
    id: row.id,
    hunarCallId: row.hunarCallId,
    requestId: row.requestId,
    candidateId: row.candidateId,
    agentId: row.agentId,
    campaignId: row.campaignId,
    status: row.status,
    lifecycleStatus: row.lifecycleStatus,
    answeredBy: row.answeredBy,
    retryCount: row.retryCount,
    durationSeconds: row.durationSeconds,
    recordingUrl: row.recordingUrl,
    result: row.result as Record<string, unknown> | null,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
    candidate,
  };
}

async function loadCandidateWithCalls(id: string) {
  const db = getDb();
  const candidate = await db.query.candidates.findFirst({ where: eq(candidates.id, id) });
  if (!candidate) return null;

  const callRows = await db.query.calls.findMany({
    where: eq(calls.candidateId, id),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
    with: { agent: true },
  });

  return { candidate, calls: callRows };
}

function toTimelineEvents(entry: NonNullable<Awaited<ReturnType<typeof loadCandidateWithCalls>>>) {
  const candidateDTO = toCandidateDTO(entry.candidate);

  const events: TimelineEvent[] = [
    {
      type: "sourced",
      at: candidateDTO.createdAt,
      label: sourcedLabel(entry.candidate.source),
      candidate: candidateDTO,
    },
  ];

  for (const call of entry.calls) {
    events.push({
      type: "call",
      at: call.createdAt.toISOString(),
      purpose: call.agent?.purpose ?? null,
      call: toCallDTO(call, candidateDTO),
    });
  }

  return events;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const primary = await loadCandidateWithCalls(id);
  if (!primary) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const events: TimelineEvent[] = [];

  // A REACHOUT_SYNC candidate's own row only exists from the moment it was synced
  // into the Hiring pipeline — its earlier history (being sourced, and the reachout
  // call that led to the sync) lives on the original Talent Search candidate row
  // referenced by sourceCandidateId. Pull that in too so the timeline is complete.
  if (primary.candidate.source === "REACHOUT_SYNC" && primary.candidate.sourceCandidateId) {
    const source = await loadCandidateWithCalls(primary.candidate.sourceCandidateId);
    if (source) events.push(...toTimelineEvents(source));
  }

  events.push(...toTimelineEvents(primary));

  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return NextResponse.json({ candidate: toCandidateDTO(primary.candidate), timeline: events });
}
