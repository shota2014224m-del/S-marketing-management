import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Two separate queries to avoid relying on ScriptScene.audioAssets relation
    // which may not be present in the cached Prisma client after schema changes.
    const scripts = await prisma.script.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        topic: true,
        status: true,
        scenes: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            text: true,
            duration: true,
          },
        },
      },
    });

    const audioAssets = await prisma.audioAsset.findMany({
      where: { sceneId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sceneId: true,
        title: true,
        status: true,
        service: true,
        audioUrl: true,
        voice: true,
        duration: true,
      },
    });

    // Group audio assets by sceneId
    const audioByScene = new Map<string, typeof audioAssets>();
    for (const a of audioAssets) {
      const key = a.sceneId as string;
      if (!audioByScene.has(key)) audioByScene.set(key, []);
      audioByScene.get(key)!.push(a);
    }

    const result = scripts.map((s) => {
      const scenesWithAudio = s.scenes.map((sc) => ({
        ...sc,
        audioAssets: audioByScene.get(sc.id) ?? [],
      }));

      const totalScenes = scenesWithAudio.length;
      const completedScenes = scenesWithAudio.filter((sc) =>
        sc.audioAssets.some((a) => a.status === "completed")
      ).length;
      const pendingScenes = scenesWithAudio.filter((sc) =>
        sc.audioAssets.some((a) => a.status === "pending" || a.status === "generating")
      ).length;

      return { ...s, scenes: scenesWithAudio, totalScenes, completedScenes, pendingScenes };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/audio/overview]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
