import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const scripts = await prisma.script.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true } },
      scenes: { orderBy: { order: "asc" } },
      _count: { select: { imageAssets: true, videoAssets: true } },
      imageAssets: { select: { status: true } },
      videoAssets: { select: { status: true } },
    },
  });

  // シーン数とasset完了数を付加
  const enriched = scripts.map((s) => ({
    ...s,
    sceneCount: s.scenes.length,
    scenesWithNote: s.scenes.filter((sc) => sc.visualNote).length,
    imageCompletedCount: s.imageAssets.filter((a) => a.status === "completed").length,
    videoCompletedCount: s.videoAssets.filter((a) => a.status === "completed").length,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const script = await prisma.script.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      topic: body.topic,
      hook: body.hook,
      body: body.body,
      callToAction: body.callToAction,
      hashtags: body.hashtags,
      duration: body.duration ? Number(body.duration) : null,
      status: body.status || "draft",
      aiModel: body.aiModel,
      prompt: body.prompt,
    },
  });

  if (body.scenes && Array.isArray(body.scenes)) {
    await prisma.scriptScene.createMany({
      data: body.scenes.map((s: { text: string; visualNote?: string; duration?: number }, i: number) => ({
        scriptId: script.id,
        order: i + 1,
        text: s.text,
        visualNote: s.visualNote,
        duration: s.duration,
      })),
    });
  }

  return NextResponse.json(script, { status: 201 });
}
