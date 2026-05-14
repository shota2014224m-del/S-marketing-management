import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const image = await prisma.imageAsset.update({ where: { id }, data: body });
  return NextResponse.json(image);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.imageAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
