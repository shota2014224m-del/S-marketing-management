import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  const { scenes, ...data } = body;

  const script = await prisma.script.update({ where: { id }, data });

  if (scenes && Array.isArray(scenes)) {
    await prisma.scriptScene.deleteMany({ where: { scriptId: id } });
    await prisma.scriptScene.createMany({
      data: scenes.map((s: { text: string; visualNote?: string; duration?: number }, i: number) => ({
        scriptId: id,
        order: i + 1,
        text: s.text,
        visualNote: s.visualNote,
        duration: s.duration,
      })),
    });
  }

  return NextResponse.json(script);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.script.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
