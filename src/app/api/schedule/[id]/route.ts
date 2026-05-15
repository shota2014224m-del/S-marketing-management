import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick, safeDate } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
  } catch (e) {
    console.error("[PATCH /api/schedule/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.postSchedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/schedule/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
