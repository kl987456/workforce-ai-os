import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agents } from "@/db/schema";
import { hunar } from "./client";
import {
  HIRING_SCREEN_AGENT_TEMPLATE,
  TALENT_REACHOUT_AGENT_TEMPLATE,
} from "./agent-templates";

type AgentPurpose = "HIRING_SCREEN" | "TALENT_REACHOUT";

const TEMPLATES: Record<AgentPurpose, typeof HIRING_SCREEN_AGENT_TEMPLATE> = {
  HIRING_SCREEN: HIRING_SCREEN_AGENT_TEMPLATE,
  TALENT_REACHOUT: TALENT_REACHOUT_AGENT_TEMPLATE,
};

/**
 * Returns the local agent row for the given purpose, creating it on Hunar
 * (and caching it in our DB) on first use. Safe to call from any request —
 * cheap DB read on the common path.
 */
export async function getOrCreateDefaultAgent(purpose: AgentPurpose) {
  const db = getDb();

  const existing = await db.query.agents.findFirst({
    where: eq(agents.purpose, purpose),
  });
  if (existing) return existing;

  const template = TEMPLATES[purpose];
  const created = await hunar.agents.create(template);

  const [row] = await db
    .insert(agents)
    .values({
      hunarAgentId: created.id,
      purpose,
      name: template.name,
      language: template.language,
      voicePersona: template.voice_persona,
      personaName: template.persona_name,
      agentPrompt: template.agent_prompt,
      objective: template.objective,
      introduction: template.introduction,
      resultPrompt: template.result_prompt,
      resultSchema: template.result_schema,
    })
    .returning();

  return row;
}
