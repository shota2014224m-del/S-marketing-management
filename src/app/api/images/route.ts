import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scriptId = searchParams.get("scriptId");

  const images = await prisma.imageAsset.findMany({
    where: scriptId ? { scriptId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      script: { select: { title: true } },
      scene: { select: { order: true, text: true } },
    },
  });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const image = await prisma.imageAsset.create({
    data: {
      scriptId: body.scriptId || null,
      sceneId: body.sceneId || null,
      title: body.title,
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
      service: body.service || "dall-e-3",
      status: body.status || "pending",
      imageUrl: body.imageUrl,
      style: body.style,
      aspectRatio: body.aspectRatio || "9:16",
      width: body.width ? Number(body.width) : null,
      height: body.height ? Number(body.height) : null,
      notes: body.notes,
    },
  });
  return NextResponse.json(image, { status: 201 });
}
