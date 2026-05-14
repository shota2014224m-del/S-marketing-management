import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick, safeDate } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = pick(body, ["title", "description", "status", "priority", "category", "dueDate", "tags", "order"]);
  const { dueDate, ...rest } = allowed;
  const task = await prisma.scheduleTask.update({
    where: { id },
    data: { ...rest, dueDate: safeDate(dueDate) },
  });
  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.scheduleTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
