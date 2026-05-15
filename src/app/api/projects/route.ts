import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { scripts: true, scheduleTasks: true } } },
    });
    return NextResponse.json(projects);
  } catch (e) {
    console.error("[GET /api/projects]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const project = await prisma.project.create({
      data: {
        title: body.title,
        description: body.description,
        genre: body.genre,
        targetAudience: body.targetAudience,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error("[POST /api/projects]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
