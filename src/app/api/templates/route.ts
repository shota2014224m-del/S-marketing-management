import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const templates = await prisma.videoTemplate.findMany({ orderBy: { usageCount: "desc" } });
    return NextResponse.json(templates);
  } catch (e) {
    console.error("[GET /api/templates]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, genre, targetAudience, duration, tone, keywords, structure, hookTemplate, ctaTemplate, notes } = body;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const template = await prisma.videoTemplate.create({
      data: { name, genre, targetAudience, duration: duration ?? 60, tone, keywords, structure, hookTemplate, ctaTemplate, notes },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (e) {
    console.error("[POST /api/templates]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
