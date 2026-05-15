import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const maxDuration = 120;

async function resolveOpenAIKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const row = await prisma.settings.findUnique({ where: { key: "openai_api_key" } });
  if (!row?.value) throw new Error("OpenAI API keyが設定されていません。設定ページで登録してください。");
  return row.value;
}

const GPT_IMAGE_SIZE: Record<string, string> = {
  "9:16": "1024x1536",
  "1:1":  "1024x1024",
  "16:9": "1536x1024",
};
const DALLE3_SIZE: Record<string, string> = {
  "9:16": "1024x1792",
  "1:1":  "1024x1024",
  "16:9": "1792x1024",
};

async function callOpenAI(apiKey: string, prompt: string, aspectRatio: string): Promise<string> {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };

  // --- gpt-image-1 を試す（b64_json で返る）---
  const gptRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: GPT_IMAGE_SIZE[aspectRatio] ?? "1024x1536",
    }),
  });

  if (gptRes.ok) {
    const data = await gptRes.json();
    const item = data.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  } else {
    const gptErr = await gptRes.json().catch(() => ({}));
    console.warn("[generate] gpt-image-1 失敗:", gptErr?.error?.message ?? gptRes.status);
  }

  // --- dall-e-3 にフォールバック ---
  const d3Res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: DALLE3_SIZE[aspectRatio] ?? "1024x1792",
      quality: "standard",
    }),
  });

  if (d3Res.ok) {
    const data = await d3Res.json();
    const url = data.data?.[0]?.url;
    if (url) return url;
  }

  const d3Err = await d3Res.json().catch(() => ({}));
  const d3Msg = d3Err?.error?.message ?? `OpenAI APIエラー: ${d3Res.status}`;
  console.error("[generate] dall-e-3 も失敗:", d3Msg);

  // 利用可能な画像モデルを診断して表示
  try {
    const modelsRes = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (modelsRes.ok) {
      const { data } = await modelsRes.json() as { data: { id: string }[] };
      const imageModels = data.map((m) => m.id).filter((id) => id.includes("dall") || id.includes("image"));
      console.error("[generate] このAPIキーで使える画像モデル:", imageModels.length ? imageModels.join(", ") : "なし");
    }
  } catch { /* 診断失敗は無視 */ }

  throw new Error(d3Msg);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const image = await prisma.imageAsset.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const apiKey = await resolveOpenAIKey();
    await prisma.imageAsset.update({ where: { id }, data: { status: "generating" } });

    const rawUrl = await callOpenAI(apiKey, image.prompt, image.aspectRatio ?? "9:16");

    // b64_json の場合はローカルに保存
    let finalUrl = rawUrl;
    if (rawUrl.startsWith("data:image/")) {
      const base64 = rawUrl.split(",")[1];
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
