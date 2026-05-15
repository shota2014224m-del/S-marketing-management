import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scriptId = searchParams.get("scriptId");

    const videos = await prisma.videoAsset.findMany({
      where: scriptId ? { scriptId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        script: { select: { title: true } },
        image: { select: { title: true, imageUrl: true } },
      },
    });
    return NextResponse.json(videos);
  } catch (e) {
    console.error("[GET /api/videos]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const video = await prisma.videoAsset.create({
      data: {
        scriptId: body.scriptId || null,
        imageId: body.imageId || null,
        title: body.title,
        service: body.service || "d-id",
        status: body.status || "pending",
        videoUrl: body.videoUrl,
        thumbnailUrl: body.thumbnailUrl,
        duration: body.duration ? Number(body.duration) : null,
        aspectRatio: body.aspectRatio || "9:16",
        notes: body.notes,
        jobId: body.jobId,
      },
    });
    return NextResponse.json(video, { status: 201 });
  } catch (e) {
    console.error("[POST /api/videos]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
