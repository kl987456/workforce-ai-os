import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { agents, campaigns } from "@/db/schema";
import { hunar, HunarApiError } from "@/lib/hunar/client";
import {
  HIRING_SCREEN_AGENT_TEMPLATE,
  TALENT_REACHOUT_AGENT_TEMPLATE,
} from "@/lib/hunar/agent-templates";
import { buildCustomAgentPrompt } from "@/lib/hunar/customize-agent-prompt";

const idSchema = z.string().uuid();

const VOICE_PERSONAS = ["NEHA", "ROY", "ZOE", "SAM", "MIRA", "EESHA"] as const;

const customizeAgentSchema = z.object({
  questions: z.array(z.string().trim().min(1)).min(1).max(8),
  voicePersona: z.enum(VOICE_PERSONAS),
  personaName: z.string().trim().min(1),
});

/** GET returns the campaign's current custom agent (or null if it still uses the
 *  shared default) so the "Customize AI agent" dialog can prefill its fields. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }
  const db = getDb();

  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.agentId) {
    return NextResponse.json({ agent: null });
  }

  const agent = await db.query.agents.findFirst({ where: eq(agents.id, campaign.agentId) });
  return NextResponse.json({ agent: agent ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }
  const db = getDb();

  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = customizeAgentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { questions, voicePersona, personaName } = parsed.data;

  const purpose = campaign.kind === "HIRING" ? "HIRING_SCREEN" : "TALENT_REACHOUT";
  const template =
    purpose === "HIRING_SCREEN" ? HIRING_SCREEN_AGENT_TEMPLATE : TALENT_REACHOUT_AGENT_TEMPLATE;

  const customPrompt = buildCustomAgentPrompt(template, purpose, questions, personaName);
  const introduction = template.persona_name
    ? template.introduction.replace(template.persona_name, personaName)
    : template.introduction;

  let created: Awaited<ReturnType<typeof hunar.agents.create>>;
  try {
    created = await hunar.agents.create({
      ...template,
      voice_persona: voicePersona,
      persona_name: personaName,
      agent_prompt: customPrompt,
      introduction,
    });
  } catch (err) {
    const message =
      err instanceof HunarApiError ? err.message : "Failed to create the custom Hunar voice agent";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const [row] = await db
    .insert(agents)
    .values({
      hunarAgentId: created.id,
      purpose,
      name: template.name,
      language: template.language,
      voicePersona,
      personaName,
      agentPrompt: customPrompt,
      objective: template.objective,
      introduction,
      resultPrompt: template.result_prompt,
      resultSchema: template.result_schema,
    })
    .returning();

  // Repoint the campaign at the new agent without deleting the old one — any past
  // calls still reference their original agent row and resolve it correctly.
  await db.update(campaigns).set({ agentId: row.id }).where(eq(campaigns.id, id));

  return NextResponse.json({ agent: row }, { status: 201 });
}
