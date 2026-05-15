import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = pick(body, ["title", "status", "imageUrl", "localPath", "style", "aspectRatio", "width", "height", "notes"]);
    const image = await prisma.imageAsset.update({ where: { id }, data });
    return NextResponse.json(image);
  } catch (e) {
    console.error("[PATCH /api/images/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exists = await prisma.imageAsset.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "画像が見つかりません" }, { status: 404 });
    await prisma.imageAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/images/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
