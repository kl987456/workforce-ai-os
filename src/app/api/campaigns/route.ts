import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, candidates } from "@/db/schema";
import { getPeopleSearchProvider, parseJobDescription } from "@/lib/people-search/provider";

const createCampaignSchema = z.object({
  kind: z.enum(["HIRING", "TALENT_SEARCH"]),
  title: z.string().min(2),
  department: z.string().optional(),
  location: z.string().optional(),
  jobDescription: z.string().min(10),
});

export async function GET(req: NextRequest) {
  const db = getDb();
  const kind = req.nextUrl.searchParams.get("kind");

  const rows = await db.query.campaigns.findMany({
    where: kind === "HIRING" || kind === "TALENT_SEARCH" ? eq(campaigns.kind, kind) : undefined,
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  return NextResponse.json({ campaigns: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const json = await req.json();
  const parsed = createCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { kind, title, department, location, jobDescription } = parsed.data;

  const parsedQuery = parseJobDescription(jobDescription);

  const [campaign] = await db
    .insert(campaigns)
    .values({
      kind,
      title,
      department,
      location: location ?? parsedQuery.location,
      jobDescription,
      parsedFilters: parsedQuery,
    })
    .returning();

  let seededCandidates: (typeof candidates.$inferSelect)[] = [];

  if (kind === "TALENT_SEARCH") {
    const provider = getPeopleSearchProvider();
    const results = await provider.search(parsedQuery, 12);

    if (results.length > 0) {
      seededCandidates = await db
        .insert(candidates)
        .values(
          results.map((r) => ({
            campaignId: campaign.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            roleTitle: r.title,
            company: r.company,
            location: r.location,
            yearsExperience: r.yearsExperience,
            skills: r.skills,
            matchScore: r.matchScore,
            source: "SEEDED_SEARCH" as const,
            profile: { summary: r.summary, linkedinUrl: r.linkedinUrl, provider: provider.id },
          }))
        )
        .returning();
    }
  }

  return NextResponse.json({ campaign, candidates: seededCandidates }, { status: 201 });
}
