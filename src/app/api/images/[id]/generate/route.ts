import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function resolveOpenAIKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const row = await prisma.settings.findUnique({ where: { key: "openai_api_key" } });
  if (!row?.value) throw new Error("OpenAI API keyが設定されていません。設定ページで登録してください。");
  return row.value;
}

const DALLE_SIZE: Record<string, string> = {
  "9:16": "1024x1792",
  "1:1":  "1024x1024",
  "16:9": "1792x1024",
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const image = await prisma.imageAsset.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const apiKey = await resolveOpenAIKey();
    await prisma.imageAsset.update({ where: { id }, data: { status: "generating" } });

    const size = DALLE_SIZE[image.aspectRatio ?? "9:16"] ?? "1024x1792";
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "dall-e-3", prompt: image.prompt, n: 1, size, quality: "standard" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      await prisma.imageAsset.update({ where: { id }, data: { status: "failed" } });
      throw new Error(err?.error?.message || `OpenAI APIエラー: ${res.status}`);
    }

    const data = await res.json();
    const imageUrl: string | undefined = data.data?.[0]?.url;
    if (!imageUrl) throw new Error("生成された画像URLがありません");

    const updated = await prisma.imageAsset.update({
      where: { id },
      data: { imageUrl, status: "completed" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[POST /api/images/[id]/generate]", e);
    // failedに戻す（generating中の場合のみ）
    const current = await prisma.imageAsset.findUnique({ where: { id }, select: { status: true } }).catch(() => null);
    if (current?.status === "generating") {
      await prisma.imageAsset.update({ where: { id }, data: { status: "failed" } }).catch(() => null);
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
