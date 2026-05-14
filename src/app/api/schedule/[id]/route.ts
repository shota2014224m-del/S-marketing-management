import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick, safeDate } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = pick(body, ["platform", "title", "caption", "hashtags", "scheduledAt", "postedAt", "status", "postUrl", "notes"]);
  const { scheduledAt, postedAt, ...rest } = allowed;
  const post = await prisma.postSchedule.update({
    where: { id },
    data: {
      ...rest,
      scheduledAt: safeDate(scheduledAt),
      postedAt: safeDate(postedAt),
    },
  });
  return NextResponse.json(post);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.postSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
