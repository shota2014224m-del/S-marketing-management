import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tasks = await prisma.scheduleTask.findMany({
      orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: { project: { select: { title: true } } },
    });
    return NextResponse.json(tasks);
  } catch (e) {
    console.error("[GET /api/tasks]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (e) {
    console.error("[POST /api/tasks]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
