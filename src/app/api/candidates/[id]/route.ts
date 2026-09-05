import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { candidates } from "@/db/schema";

const patchCandidateSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => data.isFavorite !== undefined || data.notes !== undefined, {
    message: "At least one of isFavorite or notes must be provided",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const json = await req.json();
  const parsed = patchCandidateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await db.query.candidates.findFirst({ where: eq(candidates.id, id) });
  if (!existing) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { isFavorite, notes } = parsed.data;
  const [updated] = await db
    .update(candidates)
    .set({
      ...(isFavorite !== undefined ? { isFavorite } : {}),
      ...(notes !== undefined ? { notes } : {}),
    })
    .where(eq(candidates.id, id))
    .returning();

  return NextResponse.json({ candidate: updated });
}
