import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pattern = await prisma.learningPattern.findUnique({ where: { id } });
  if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.learningPattern.delete({ where: { id } });

  // Optionally remove the Obsidian file
  if (pattern.obsidianPath) {
    const row = await prisma.settings.findUnique({ where: { key: "obsidian_vault_path" } });
    if (row?.value) {
      const fullPath = path.join(row.value, pattern.obsidianPath);
      await fs.unlink(fullPath).catch(() => {/* ignore if already gone */});
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { usageCount } = await req.json();
  const pattern = await prisma.learningPattern.update({
    where: { id },
    data: { usageCount: { increment: usageCount ?? 1 } },
  });
  return NextResponse.json(pattern);
}
