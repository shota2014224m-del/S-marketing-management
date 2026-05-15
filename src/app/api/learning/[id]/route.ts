import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pattern = await prisma.learningPattern.findUnique({ where: { id } });
    if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.learningPattern.delete({ where: { id } });

    if (pattern.obsidianPath) {
      const row = await prisma.settings.findUnique({ where: { key: "obsidian_vault_path" } });
      if (row?.value) {
        const fullPath = path.join(row.value, pattern.obsidianPath);
        await fs.unlink(fullPath).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/learning/[id]]", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { usageCount } = await req.json();
    const pattern = await prisma.learningPattern.update({
      where: { id },
      data: { usageCount: { increment: usageCount ?? 1 } },
    });
    return NextResponse.json(pattern);
  } catch (e) {
    console.error("[PATCH /api/learning/[id]]", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
