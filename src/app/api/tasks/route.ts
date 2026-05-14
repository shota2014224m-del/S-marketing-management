import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tasks = await prisma.scheduleTask.findMany({
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    include: { project: { select: { title: true } } },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = await prisma.scheduleTask.create({
    data: {
      projectId: body.projectId || null,
      title: body.title,
      description: body.description,
      status: body.status || "todo",
      priority: body.priority || "medium",
      category: body.category,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      tags: body.tags,
    },
  });
  return NextResponse.json(task, { status: 201 });
}
