import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface AudioRow {
  id: string;
  sceneId: string | null;
  title: string;
  status: string;
  service: string;
  audioUrl: string | null;
  voice: string | null;
  duration: number | null;
}

export async function GET() {
  try {
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

    // Use raw SQL to fetch audio assets so this query works regardless of which
    // Prisma client version is cached in the running process. The sceneId column
    // was added in a migration and may not be known to an older cached client.
    const audioAssets: AudioRow[] = await prisma.$queryRawUnsafe(
      'SELECT id, sceneId, title, status, service, audioUrl, voice, duration FROM "AudioAsset" WHERE sceneId IS NOT NULL ORDER BY createdAt DESC'
    );

    // Group audio assets by sceneId
    const audioByScene = new Map<string, AudioRow[]>();
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
