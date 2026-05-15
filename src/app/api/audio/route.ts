import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scriptId = searchParams.get("scriptId");

    let audios: unknown[];
    if (scriptId) {
      audios = await prisma.$queryRawUnsafe(
        `SELECT a.id, a.scriptId, a.sceneId, a.title, a.text, a.service, a.status, a.audioUrl, a.duration, a.voice, a.language, a.notes, a.createdAt, a.updatedAt,
                s.title as scriptTitle
         FROM "AudioAsset" a
         LEFT JOIN "Script" s ON s.id = a.scriptId
         WHERE a.scriptId = ?
         ORDER BY a.createdAt DESC`,
        scriptId
      );
    } else {
      audios = await prisma.$queryRawUnsafe(
        `SELECT a.id, a.scriptId, a.sceneId, a.title, a.text, a.service, a.status, a.audioUrl, a.duration, a.voice, a.language, a.notes, a.createdAt, a.updatedAt,
                s.title as scriptTitle
         FROM "AudioAsset" a
         LEFT JOIN "Script" s ON s.id = a.scriptId
         ORDER BY a.createdAt DESC`
      );
    }

    // Shape the response to match what the original Prisma query returned (nested script object)
    const shaped = (audios as Record<string, unknown>[]).map((a) => {
      const { scriptTitle, ...rest } = a;
      return { ...rest, script: scriptTitle ? { title: scriptTitle } : null };
    });

    return NextResponse.json(shaped);
  } catch (e) {
    console.error("[GET /api/audio]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.text || !body.service) {
      return NextResponse.json({ error: "title, text, service は必須です" }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const status = body.status || "pending";
    const language = body.language || "ja";

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AudioAsset" (id, scriptId, sceneId, title, text, service, status, audioUrl, duration, voice, language, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      body.scriptId || null,
      body.sceneId || null,
      body.title,
      body.text,
      body.service,
      status,
      body.audioUrl || null,
      body.duration ? Number(body.duration) : null,
      body.voice || null,
      language,
      body.notes || null,
      now,
      now
    );

    const rows: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "AudioAsset" WHERE id = ?`,
      id
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    console.error("[POST /api/audio]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
