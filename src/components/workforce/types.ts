export interface CampaignDTO {
  id: string;
  kind: "HIRING" | "TALENT_SEARCH";
  title: string;
  department: string | null;
  location: string | null;
  jobDescription: string;
  createdAt: string;
}

export interface CandidateDTO {
  id: string;
  campaignId: string | null;
  name: string;
  email: string | null;
  phone: string;
  roleTitle: string | null;
  company: string | null;
  location: string | null;
  yearsExperience: number | null;
  skills: string[];
  matchScore: number | null;
  source: "MANUAL" | "SEEDED_SEARCH" | "REACHOUT_SYNC";
  profile: {
    summary?: string;
    linkedinUrl?: string;
    provider?: string;
    reachoutResult?: Record<string, unknown>;
  } | null;
  sourceCallId: string | null;
  sourceCandidateId: string | null;
  isFavorite: boolean;
  notes: string | null;
  createdAt: string;
}

export interface CallDTO {
  id: string;
  hunarCallId: string | null;
  requestId: string | null;
  candidateId: string;
  agentId: string;
  campaignId: string | null;
  status:
    | "NOT_STARTED"
    | "SCHEDULED"
    | "INITIATED"
    | "RINGING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "NOT_CONNECTED"
    | "FAILED"
    | "CANCELLED";
  lifecycleStatus: string | null;
  answeredBy: string | null;
  retryCount: number | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
  candidate?: CandidateDTO;
}

export const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "NOT_CONNECTED",
  "FAILED",
  "CANCELLED",
]);

/**
 * One entry in a candidate's unified timeline (GET /api/candidates/[id]/timeline).
 * A 'sourced' event marks a candidate row coming into existence (added manually,
 * matched by a Talent Search, or synced into the Hiring pipeline from a reachout
 * call) — `candidate` is a full CandidateDTO so the header info is available
 * without a second lookup. A 'call' event carries a full CallDTO (with `candidate`
 * populated) so it can be dropped straight into CallDetailSheet if ever needed.
 */
export interface TimelineSourcedEvent {
  type: "sourced";
  at: string;
  label: string;
  candidate: CandidateDTO;
}

export interface TimelineCallEvent {
  type: "call";
  at: string;
  purpose: "HIRING_SCREEN" | "TALENT_REACHOUT" | null;
  call: CallDTO;
}

export type TimelineEvent = TimelineSourcedEvent | TimelineCallEvent;

export interface CandidateTimelineResponse {
  candidate: CandidateDTO;
  timeline: TimelineEvent[];
}
