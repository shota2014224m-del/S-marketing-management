import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const posts = await prisma.postSchedule.findMany({
    orderBy: { scheduledAt: "asc" },
    include: {
      project: { select: { title: true } },
      video: { select: { title: true, thumbnailUrl: true } },
      analytics: true,
    },
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const post = await prisma.postSchedule.create({
    data: {
      projectId: body.projectId || null,
      videoId: body.videoId || null,
      platform: body.platform,
      title: body.title,
      caption: body.caption,
      hashtags: body.hashtags,
      scheduledAt: new Date(body.scheduledAt),
      notes: body.notes,
    },
  });
  return NextResponse.json(post, { status: 201 });
}
