import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALLOWED_FIELDS = ["title", "text", "status", "audioUrl", "localPath", "duration", "voice", "language", "notes"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(field === "duration" && body[field] != null ? Number(body[field]) : body[field] ?? null);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    updates.push(`updatedAt = ?`);
    values.push(new Date().toISOString());
    values.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE "AudioAsset" SET ${updates.join(", ")} WHERE id = ?`,
      ...values
    );

    const rows: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "AudioAsset" WHERE id = ?`,
      id
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "音声が見つかりません" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error("[PATCH /api/audio/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const rows: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "AudioAsset" WHERE id = ?`,
      id
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "音声が見つかりません" }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "AudioAsset" WHERE id = ?`, id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/audio/[id]]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
