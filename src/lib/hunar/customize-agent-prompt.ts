import "server-only";
import type { HIRING_SCREEN_AGENT_TEMPLATE, TALENT_REACHOUT_AGENT_TEMPLATE } from "./agent-templates";

type AgentTemplate =
  | typeof HIRING_SCREEN_AGENT_TEMPLATE
  | typeof TALENT_REACHOUT_AGENT_TEMPLATE;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a regex that matches `text` even where the template's own source
 * formatting wraps it across lines — every run of whitespace in `text`
 * becomes a flexible \s+ in the pattern, so line-wrapping changes in
 * agent-templates.ts can't silently break the match.
 */
function toFlexibleRegex(text: string): RegExp {
  const tokens = text.trim().split(/\s+/).map(escapeRegExp);
  return new RegExp(tokens.join("\\s+"));
}

/**
 * The generic screening-question clause baked into each base template's
 * agent_prompt, swapped out for an explicit numbered list of the recruiter's
 * own questions when a campaign customizes its agent — everything else in
 * the prompt (persona, tone, objective sentences) is left untouched.
 */
const GENERIC_CLAUSE_TEXT_BY_PURPOSE: Record<"HIRING_SCREEN" | "TALENT_REACHOUT", string> = {
  HIRING_SCREEN:
    "ask 2-3 role-relevant screening questions based on the job context provided in custom_data (role_title, key_skills), then ask about compensation expectations, notice period, and location/relocation flexibility.",
  TALENT_REACHOUT:
    "If open, ask about current situation (employed/looking), expected compensation range, and notice period.",
};

function numberedList(questions: string[]): string {
  return questions.map((q, i) => `${i + 1}. ${q.trim()}`).join("\n");
}

/**
 * Builds a campaign-specific agent_prompt: the recruiter's concrete
 * screening questions replace the template's generic screening-question
 * instruction, and the template's default persona name (Neha/Roy) is
 * swapped for the campaign's custom persona display name. Persona/tone/
 * objective sentences elsewhere in the prompt are kept intact.
 */
export function buildCustomAgentPrompt(
  template: AgentTemplate,
  purpose: "HIRING_SCREEN" | "TALENT_REACHOUT",
  questions: string[],
  personaName: string
): string {
  const replacement =
    purpose === "HIRING_SCREEN"
      ? `ask the candidate the following screening questions, in this order:\n${numberedList(
          questions
        )}\nThen ask about compensation expectations, notice period, and location/relocation flexibility.`
      : `If open, ask the candidate the following screening questions, in this order:\n${numberedList(
          questions
        )}\nAlso confirm current situation (employed/looking), expected compensation range, and notice period.`;

  const clauseRegex = toFlexibleRegex(GENERIC_CLAUSE_TEXT_BY_PURPOSE[purpose]);
  const withQuestions = template.agent_prompt.replace(clauseRegex, replacement);

  const defaultPersonaName = template.persona_name ?? "";
  return defaultPersonaName
    ? withQuestions.split(defaultPersonaName).join(personaName)
    : withQuestions;
}
