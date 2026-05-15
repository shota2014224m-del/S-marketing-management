import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
            audioAssets: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                status: true,
                service: true,
                audioUrl: true,
                voice: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    // スクリプトに統計を付与して返す
    const result = scripts.map((s) => {
      const totalScenes = s.scenes.length;
      const completedScenes = s.scenes.filter((sc) =>
        sc.audioAssets.some((a) => a.status === "completed")
      ).length;
      const pendingScenes = s.scenes.filter((sc) =>
        sc.audioAssets.some((a) => a.status === "pending" || a.status === "generating")
      ).length;
      return { ...s, totalScenes, completedScenes, pendingScenes };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/audio/overview]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
