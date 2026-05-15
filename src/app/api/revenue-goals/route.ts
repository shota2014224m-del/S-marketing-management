import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const goals = await prisma.revenueGoal.findMany({ orderBy: { yearMonth: "desc" }, take: 12 });
    return NextResponse.json(goals);
  } catch (e) {
    console.error("[GET /api/revenue-goals]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { yearMonth, goal, actual, notes } = await req.json();
    if (!yearMonth || goal == null) return NextResponse.json({ error: "yearMonth and goal required" }, { status: 400 });
    const record = await prisma.revenueGoal.upsert({
      where: { yearMonth },
      update: { goal, actual: actual ?? 0, notes },
      create: { yearMonth, goal, actual: actual ?? 0, notes },
    });
    return NextResponse.json(record);
  } catch (e) {
    console.error("[POST /api/revenue-goals]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
