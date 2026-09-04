import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, candidates, calls } from "@/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const [candidateRows, callRows] = await Promise.all([
    db.query.candidates.findMany({
      where: eq(candidates.campaignId, id),
      orderBy: (c, { desc }) => [desc(c.matchScore)],
    }),
    db.query.calls.findMany({
      where: eq(calls.campaignId, id),
      orderBy: [desc(calls.createdAt)],
      with: { candidate: true },
    }),
  ]);

  return NextResponse.json({ campaign, candidates: candidateRows, calls: callRows });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // No FK cascade configured, so delete children before the parent: calls
  // reference both candidates and the campaign, candidates reference the campaign.
  await db.delete(calls).where(eq(calls.campaignId, id));
  await db.delete(candidates).where(eq(candidates.campaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));

  return NextResponse.json({ ok: true });
}
