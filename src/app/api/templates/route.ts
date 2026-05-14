import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.videoTemplate.findMany({ orderBy: { usageCount: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, genre, targetAudience, duration, tone, keywords, structure, hookTemplate, ctaTemplate, notes } = body;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const template = await prisma.videoTemplate.create({
    data: { name, genre, targetAudience, duration: duration ?? 60, tone, keywords, structure, hookTemplate, ctaTemplate, notes },
  });
  return NextResponse.json(template, { status: 201 });
}
