import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function resolveOpenAIKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const row = await prisma.settings.findUnique({ where: { key: "openai_api_key" } });
  if (!row?.value) throw new Error("OpenAI API keyが設定されていません。設定ページで登録してください。");
  return row.value;
}

// gpt-image-1 のサイズ（dall-e-3 とは異なる）
const GPT_IMAGE_SIZE: Record<string, string> = {
  "9:16": "1024x1536",
  "1:1":  "1024x1024",
  "16:9": "1536x1024",
};

// dall-e-3 のサイズ（フォールバック用）
const DALLE3_SIZE: Record<string, string> = {
  "9:16": "1024x1792",
  "1:1":  "1024x1024",
  "16:9": "1792x1024",
};

async function callOpenAI(apiKey: string, prompt: string, aspectRatio: string): Promise<string> {
  // gpt-image-1 を先に試す
  const gptSize = GPT_IMAGE_SIZE[aspectRatio] ?? "1024x1536";
  const gptRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: gptSize,
      output_format: "url",
    }),
  });

  if (gptRes.ok) {
    const data = await gptRes.json();
    // gpt-image-1 は b64_json で返ることもある
    const item = data.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  }

  // gpt-image-1 が使えない場合は dall-e-3 にフォールバック
  const d3Size = DALLE3_SIZE[aspectRatio] ?? "1024x1792";
  const d3Res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: d3Size, quality: "standard" }),
  });

  if (!d3Res.ok) {
    const err = await d3Res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI APIエラー: ${d3Res.status}`);
  }

  const d3Data = await d3Res.json();
  const url = d3Data.data?.[0]?.url;
  if (!url) throw new Error("生成された画像URLがありません");
  return url;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const image = await prisma.imageAsset.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const apiKey = await resolveOpenAIKey();
    await prisma.imageAsset.update({ where: { id }, data: { status: "generating" } });

    const imageUrl = await callOpenAI(apiKey, image.prompt, image.aspectRatio ?? "9:16");

    // base64 の場合はファイルに保存
    let finalUrl = imageUrl;
    if (imageUrl.startsWith("data:image/")) {
      const base64 = imageUrl.split(",")[1];
      const uploadDir = path.join(process.cwd(), "public", "uploads", "images");
      await mkdir(uploadDir, { recursive: true });
      const filename = `${id}.png`;
      await writeFile(path.join(uploadDir, filename), Buffer.from(base64, "base64"));
      finalUrl = `/uploads/images/${filename}`;
    }

    const updated = await prisma.imageAsset.update({
      where: { id },
      data: { imageUrl: finalUrl, status: "completed" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[POST /api/images/[id]/generate]", e);
    const current = await prisma.imageAsset.findUnique({ where: { id }, select: { status: true } }).catch(() => null);
    if (current?.status === "generating") {
      await prisma.imageAsset.update({ where: { id }, data: { status: "failed" } }).catch(() => null);
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
