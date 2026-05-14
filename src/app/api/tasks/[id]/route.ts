import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { dueDate, ...rest } = body;
  const task = await prisma.scheduleTask.update({
    where: { id },
    data: {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.scheduleTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
