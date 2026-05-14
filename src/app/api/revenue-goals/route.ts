import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const goals = await prisma.revenueGoal.findMany({ orderBy: { yearMonth: "desc" }, take: 12 });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const { yearMonth, goal, actual, notes } = await req.json();
  if (!yearMonth || goal == null) return NextResponse.json({ error: "yearMonth and goal required" }, { status: 400 });
  const record = await prisma.revenueGoal.upsert({
    where: { yearMonth },
    update: { goal, actual: actual ?? 0, notes },
    create: { yearMonth, goal, actual: actual ?? 0, notes },
  });
  return NextResponse.json(record);
}
