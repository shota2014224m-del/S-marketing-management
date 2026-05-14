import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { scheduledAt, postedAt, ...rest } = body;
  const post = await prisma.postSchedule.update({
    where: { id },
    data: {
      ...rest,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      postedAt: postedAt ? new Date(postedAt) : undefined,
    },
  });
  return NextResponse.json(post);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.postSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
