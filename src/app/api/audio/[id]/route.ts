import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = pick(body, ["title", "text", "status", "audioUrl", "localPath", "duration", "voice", "language", "notes"]);
    const audio = await prisma.audioAsset.update({ where: { id }, data });
    return NextResponse.json(audio);
  } catch (e) {
    console.error("[PATCH /api/audio/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exists = await prisma.audioAsset.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "音声が見つかりません" }, { status: 404 });
    await prisma.audioAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/audio/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
