import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function resolveApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const row = await prisma.settings.findUnique({ where: { key: "anthropic_api_key" } });
  if (!row?.value) throw new Error("Anthropic API keyが設定されていません。設定ページで登録してください。");
  (client as unknown as { apiKey: string }).apiKey = row.value;
}

const SYSTEM_PROMPT = `You are an expert at writing image generation prompts.
Given a Japanese topic, create an English prompt for a Disney/Pixar-style anthropomorphic character image where the topic's main subject (the object/thing itself) has Disney-style eyes, a small cute nose, and a cheerful mouth/smile.

Rules:
- The object ITSELF becomes the character (e.g. a pillow cover with a face, not a person holding one)
- Use Disney/Pixar animation style: large expressive round eyes, small button nose, wide cheerful smile
- Bright, saturated colors; soft warm lighting
- Clean simple background (white or soft pastel gradient)
- Composition suitable for a 9:16 vertical SNS thumbnail
- High quality, professional character illustration
- Return ONLY the English prompt. No explanation, no Japanese.`;

export async function POST(req: NextRequest) {
  try {
    await resolveApiKey();
    const { topic, scriptId, title } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });

    // Claude でプロンプト生成
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Topic (Japanese): ${topic}` }],
    });

    const prompt = (msg.content[0] as { type: string; text: string }).text.trim();

    // 画像レコードを作成（ステータス: pending）
    const image = await prisma.imageAsset.create({
      data: {
        scriptId: scriptId ?? null,
        title: title ?? `${topic} - キャラクター`,
        prompt,
        service: "dall-e-3",
        status: "pending",
        aspectRatio: "9:16",
        style: "disney",
        notes: "ディズニー風キャラクター画像（AI生成プロンプト）",
      },
    });

    return NextResponse.json({ image, prompt }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/images/character-prompt]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
