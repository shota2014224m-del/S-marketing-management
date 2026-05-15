import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pick } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = pick(body, ["name", "genre", "targetAudience", "duration", "tone", "keywords", "structure", "hookTemplate", "ctaTemplate", "notes", "usageCount"]);
    const template = await prisma.videoTemplate.update({ where: { id }, data });
    return NextResponse.json(template);
  } catch (e) {
    console.error("[PATCH /api/templates/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.videoTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/templates/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
