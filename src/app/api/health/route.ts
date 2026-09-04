import { NextResponse } from "next/server";
import { hunar } from "@/lib/hunar/client";

export async function GET() {
  try {
    await hunar.numbers.list();
    return NextResponse.json({ hunar: "connected" });
  } catch (err) {
    return NextResponse.json(
      { hunar: "unreachable", error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
