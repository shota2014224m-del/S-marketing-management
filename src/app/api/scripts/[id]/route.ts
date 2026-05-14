import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const script = await prisma.script.findUnique({
    where: { id },
    include: {
      project: { select: { title: true } },
      scenes: { orderBy: { order: "asc" } },
      imageAssets: true,
      videoAssets: true,
    },
  });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(script);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { scenes, ...rawData } = body;
  const data = pick(rawData, ["title", "topic", "hook", "body", "callToAction", "hashtags", "duration", "status"]);

  const script = await prisma.script.update({ where: { id }, data });

  if (scenes && Array.isArray(scenes)) {
    // Preserve existing scene IDs to keep imageAsset.sceneId references valid
    const existing = await prisma.scriptScene.findMany({ where: { scriptId: id }, select: { id: true } });
    const existingIds = new Set(existing.map((s) => s.id));
    const incomingIds = new Set(
      (scenes as { id?: string }[]).filter((s) => s.id && existingIds.has(s.id)).map((s) => s.id as string)
    );

    // Null out imageAsset refs for scenes being removed, then delete them
    const removedIds = [...existingIds].filter((sid) => !incomingIds.has(sid));
    if (removedIds.length > 0) {
      await prisma.imageAsset.updateMany({ where: { sceneId: { in: removedIds } }, data: { sceneId: null } });
      await prisma.scriptScene.deleteMany({ where: { id: { in: removedIds } } });
    }

    // Update or create each scene
    for (const [i, s] of (scenes as { id?: string; text: string; visualNote?: string; duration?: number }[]).entries()) {
      const sceneData = { text: s.text, visualNote: s.visualNote ?? null, duration: s.duration ?? null, order: i + 1 };
      if (s.id && existingIds.has(s.id)) {
        await prisma.scriptScene.update({ where: { id: s.id }, data: sceneData });
      } else {
        await prisma.scriptScene.create({ data: { scriptId: id, ...sceneData } });
      }
    }
  }

  // Return full script with relations so client can update state without a second GET
  const fullScript = await prisma.script.findUnique({
    where: { id },
    include: {
      project: { select: { title: true } },
      scenes: { orderBy: { order: "asc" } },
      imageAssets: true,
      videoAssets: true,
    },
  });
  return NextResponse.json(fullScript);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.script.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
