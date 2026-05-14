import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = pick(body, ["goal", "actual", "notes"]);
  const record = await prisma.revenueGoal.update({ where: { id }, data });
  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.revenueGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
