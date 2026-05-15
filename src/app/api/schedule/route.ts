import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { safeDate } from "@/lib/utils";

export async function GET() {
  try {
    const posts = await prisma.postSchedule.findMany({
      orderBy: { scheduledAt: "asc" },
      include: {
        project: { select: { title: true } },
        video: { select: { title: true, thumbnailUrl: true } },
        analytics: true,
      },
    });
    return NextResponse.json(posts);
  } catch (e) {
    console.error("[GET /api/schedule]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.platform || !body.title || !body.scheduledAt) {
      return NextResponse.json({ error: "platform, title, scheduledAt are required" }, { status: 400 });
    }
    const scheduledAt = safeDate(body.scheduledAt);
    if (!scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is invalid" }, { status: 400 });
    }
    const post = await prisma.postSchedule.create({
      data: {
        projectId: body.projectId || null,
        videoId: body.videoId || null,
        platform: body.platform,
        title: body.title,
        caption: body.caption,
        hashtags: body.hashtags,
        scheduledAt,
        notes: body.notes,
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error("[POST /api/schedule]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
