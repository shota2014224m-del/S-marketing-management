import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scriptId = searchParams.get("scriptId");

    const audios = await prisma.audioAsset.findMany({
      where: scriptId ? { scriptId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        script: { select: { title: true } },
      },
    });
    return NextResponse.json(audios);
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
    const audio = await prisma.audioAsset.create({
      data: {
        scriptId: body.scriptId || null,
        title: body.title,
        text: body.text,
        service: body.service,
        status: body.status || "pending",
        audioUrl: body.audioUrl || null,
        duration: body.duration ? Number(body.duration) : null,
        voice: body.voice || null,
        language: body.language || "ja",
        notes: body.notes || null,
      },
    });
    return NextResponse.json(audio, { status: 201 });
  } catch (e) {
    console.error("[POST /api/audio]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
