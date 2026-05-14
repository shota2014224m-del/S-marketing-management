import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const video = await prisma.videoAsset.update({ where: { id }, data: body });
  return NextResponse.json(video);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.videoAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
