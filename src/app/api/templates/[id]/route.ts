import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = pick(body, ["name", "genre", "targetAudience", "duration", "tone", "keywords", "structure", "hookTemplate", "ctaTemplate", "notes", "usageCount"]);
  const template = await prisma.videoTemplate.update({ where: { id }, data });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.videoTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
