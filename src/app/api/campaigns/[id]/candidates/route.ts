import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, candidates } from "@/db/schema";
import { E164_REGEX } from "@/lib/phone";

const addCandidateSchema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .regex(E164_REGEX, "Phone must be E.164 format: + followed by country code and number, e.g. +917411771293"),
  email: z.string().email().optional().or(z.literal("")),
  roleTitle: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const json = await req.json();
  const parsed = addCandidateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { name, phone, email, roleTitle, location, skills } = parsed.data;

  const [candidate] = await db
    .insert(candidates)
    .values({
      campaignId: id,
      name,
      phone,
      email: email || null,
      roleTitle: roleTitle ?? campaign.title,
      location,
      skills: skills ?? [],
      source: "MANUAL",
    })
    .returning();

  return NextResponse.json({ candidate }, { status: 201 });
}
