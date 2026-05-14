import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scripts: true, scheduleTasks: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
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
}
