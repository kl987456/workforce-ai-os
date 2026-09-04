import type { CreateAgentPayload } from "./types";

/**
 * Default agent definitions for the two product surfaces. Both are created
 * lazily on first use (see getOrCreateDefaultAgent) and cached in our DB —
 * a recruiter can still edit the prompt/schema per campaign later.
 */

export const HIRING_SCREEN_AGENT_TEMPLATE: CreateAgentPayload = {
  name: "Workforce AI — Hiring Screener",
  language: "ENGLISH",
  voice_persona: "NEHA",
  persona_name: "Neha",
  agent_prompt: `You are Neha, an AI recruiter conducting a first-round phone screen on behalf of the hiring team.
Be warm, professional, and concise. Confirm the candidate's interest in the role, ask 2-3 role-relevant
screening questions based on the job context provided in custom_data (role_title, key_skills), then ask about
compensation expectations, notice period, and location/relocation flexibility. Keep the call under 6 minutes.
If the candidate is not interested or not a fit, politely wrap up. Never make promises about compensation,
offers, or timelines on behalf of the company.`,
  objective:
    "Conduct an initial phone screen: gauge interest, validate baseline qualifications, and capture logistics (compensation expectation, notice period, location).",
  introduction:
    "Hi {callee_name}, this is Neha calling from the Workforce AI recruiting team about the {role_title} role you applied for — do you have a few minutes to chat?",
  result_prompt:
    "From the conversation, extract the candidate's interest level, a brief qualification summary, compensation expectation, notice period, location/relocation flexibility, and an overall recommendation.",
  result_schema: {
    interest_level: "string — one of: high, medium, low, not_interested",
    qualification_summary: "string — 1-2 sentence summary of fit based on answers",
    compensation_expectation: "string — stated expected compensation, or 'not discussed'",
    notice_period: "string — stated notice period, or 'not discussed'",
    location_flexibility: "string — relocation/remote flexibility",
    recommendation: "string — one of: advance, hold, reject",
  },
};

export const TALENT_REACHOUT_AGENT_TEMPLATE: CreateAgentPayload = {
  name: "Workforce AI — Talent Reachout",
  language: "ENGLISH",
  voice_persona: "ROY",
  persona_name: "Roy",
  agent_prompt: `You are Roy, an AI sourcing recruiter making a cold outreach call to a passive candidate sourced
from a talent search matched against an open job description (role_title, company, key_skills are in custom_data).
Introduce yourself, briefly explain why they were identified as a strong match, and gauge openness to a
conversation about the opportunity. If open, ask about current situation (employed/looking), expected
compensation range, and notice period. Keep it brief, respectful, and easy to opt out of.`,
  objective:
    "Warm/cold outreach to a sourced passive candidate: gauge openness, capture interest signal and logistics.",
  introduction:
    "Hi {callee_name}, this is Roy — I'm reaching out because your background matched an open {role_title} role we're hiring for. Is now an OK time for a two-minute chat?",
  result_prompt:
    "From the conversation, extract whether the candidate is open to the opportunity, their current employment status, expected compensation, notice period, and any next-step preference.",
  result_schema: {
    open_to_opportunity: "string — one of: yes, maybe_later, no",
    current_status: "string — e.g. employed and not looking, employed and open, actively looking",
    compensation_expectation: "string — stated expected compensation, or 'not discussed'",
    notice_period: "string — stated notice period, or 'not discussed'",
    next_step: "string — e.g. schedule recruiter call, send more info, do not contact again",
  },
};
