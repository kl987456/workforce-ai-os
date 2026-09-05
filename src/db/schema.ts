import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  doublePrecision,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const agentPurposeEnum = pgEnum("agent_purpose", [
  "HIRING_SCREEN",
  "TALENT_REACHOUT",
]);

export const campaignKindEnum = pgEnum("campaign_kind", [
  "HIRING",
  "TALENT_SEARCH",
]);

export const candidateSourceEnum = pgEnum("candidate_source", [
  "MANUAL",
  "SEEDED_SEARCH",
  "REACHOUT_SYNC",
]);

export const callStatusEnum = pgEnum("call_status", [
  "NOT_STARTED",
  "SCHEDULED",
  "INITIATED",
  "RINGING",
  "IN_PROGRESS",
  "COMPLETED",
  "NOT_CONNECTED",
  "FAILED",
  "CANCELLED",
]);

// Local registry of Hunar Voice Agents we've created via the Hunar API.
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  hunarAgentId: text("hunar_agent_id").notNull().unique(),
  purpose: agentPurposeEnum("purpose").notNull(),
  name: text("name").notNull(),
  language: text("language").notNull(),
  voicePersona: text("voice_persona").notNull(),
  personaName: text("persona_name"),
  agentPrompt: text("agent_prompt").notNull(),
  objective: text("objective").notNull(),
  introduction: text("introduction").notNull(),
  resultPrompt: text("result_prompt").notNull(),
  resultSchema: jsonb("result_schema").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A hiring requisition (kind=HIRING) or a JD-driven sourcing sweep (kind=TALENT_SEARCH).
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: campaignKindEnum("kind").notNull(),
  title: text("title").notNull(),
  department: text("department"),
  location: text("location"),
  jobDescription: text("job_description").notNull(),
  parsedFilters: jsonb("parsed_filters"),
  agentId: uuid("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  roleTitle: text("role_title"),
  company: text("company"),
  location: text("location"),
  yearsExperience: doublePrecision("years_experience"),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  matchScore: doublePrecision("match_score"),
  source: candidateSourceEnum("source").notNull().default("MANUAL"),
  profile: jsonb("profile"),
  /** Set on rows auto-synced into a Hiring pipeline from a completed Talent Search
   *  reachout call — plain ids (no FK) since both point at rows in these same two
   *  tables and a real FK would make the schema mutually circular. */
  sourceCallId: uuid("source_call_id"),
  sourceCandidateId: uuid("source_candidate_id"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  hunarCallId: text("hunar_call_id").unique(),
  requestId: text("request_id"),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  status: callStatusEnum("status").notNull().default("NOT_STARTED"),
  lifecycleStatus: text("lifecycle_status"),
  answeredBy: text("answered_by"),
  retryCount: integer("retry_count").default(0),
  durationSeconds: doublePrecision("duration_seconds"),
  recordingUrl: text("recording_url"),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Raw audit trail of every inbound Hunar webhook delivery, for the live event feed + debugging.
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(),
  callId: text("call_id"),
  requestId: text("request_id"),
  signatureValid: boolean("signature_valid").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentsRelations = relations(agents, ({ many }) => ({
  campaigns: many(campaigns),
  calls: many(calls),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  agent: one(agents, { fields: [campaigns.agentId], references: [agents.id] }),
  candidates: many(candidates),
  calls: many(calls),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [candidates.campaignId], references: [campaigns.id] }),
  calls: many(calls),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  candidate: one(candidates, { fields: [calls.candidateId], references: [candidates.id] }),
  agent: one(agents, { fields: [calls.agentId], references: [agents.id] }),
  campaign: one(campaigns, { fields: [calls.campaignId], references: [campaigns.id] }),
}));
