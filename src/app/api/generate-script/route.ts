import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたはSNSショート動画（TikTok・YouTube Shorts・Instagram Reels）の台本作成の専門家です。
バイラルを狙える、視聴者を引きつけるスクリプトを日本語で作成してください。

出力は必ず以下のJSON形式で返してください：
{
  "title": "動画タイトル",
  "hook": "最初の3秒で視聴者を引きつけるフック（1〜2文）",
  "body": "メイン本文（全体の台本テキスト）",
  "callToAction": "最後のCTA（フォロー・いいね・コメント誘導）",
  "hashtags": "#タグ1 #タグ2 #タグ3 ...",
  "estimatedDuration": 動画の推定秒数,
  "viralScore": 1〜100の整数（バイラル可能性スコア）,
  "viralReason": "スコアの根拠（1〜2文）",
  "improvements": ["改善提案1", "改善提案2", "改善提案3"],
  "scenes": [
    {
      "order": 1,
      "text": "このシーンのセリフ・ナレーション",
      "visualNote": "画像生成用のビジュアル指示（英語で）",
      "duration": シーン秒数
    }
  ]
}`;

async function resolveApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const settingRow = await prisma.settings.findUnique({ where: { key: "anthropic_api_key" } });
  if (!settingRow?.value) {
    throw new Error("Anthropic API keyが設定されていません。設定ページで登録してください。");
  }
  (client as unknown as { apiKey: string }).apiKey = settingRow.value;
}

function buildUserPrompt(params: {
  topic: string; genre?: string; targetAudience?: string;
  duration?: number; tone?: string; keywords?: string; variant?: "A" | "B";
}) {
  const { topic, genre, targetAudience, duration = 60, tone, keywords, variant } = params;
  const variantNote = variant === "B"
    ? "\n\n※ このバリアントBは、バリアントAとは異なるアプローチ・フック・構成にしてください。"
    : "";
  return `以下の条件でショート動画の台本を作成してください：

トピック: ${topic}
ジャンル: ${genre || "エンタメ・教育"}
ターゲット層: ${targetAudience || "20〜35歳の日本人"}
動画尺: 約${duration}秒
トーン: ${tone || "分かりやすく親しみやすい"}
${keywords ? `キーワード: ${keywords}` : ""}

バイラルのポイント:
- 最初の3秒で視聴者を引きつけること
- 具体的な数字や事実を使う
- 視聴者が「保存したい」「シェアしたい」と思う内容
- シーンは5〜8個に分割し、各シーンに画像生成向けのビジュアル指示も含める
- viralScore（1〜100）と改善提案も必ず含めること${variantNote}`;
}

async function generateOne(userPrompt: string) {
  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const content = response.content[0];
  if (content.type !== "text") throw new Error("予期しないレスポンス形式");
  // Match the last (outermost) JSON object to avoid partial matches on nested braces
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSONの解析に失敗しました");
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("JSONの解析に失敗しました");
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topic, genre, targetAudience, duration = 60, tone, keywords, projectId, abTest } = body;

  if (!topic || typeof topic !== "string") return NextResponse.json({ error: "topic is required" }, { status: 400 });
  if (topic.length > 500) return NextResponse.json({ error: "topicが長すぎます（500文字以内）" }, { status: 400 });

  try {
    await resolveApiKey();

    if (abTest) {
      // ⑦ A/Bテスト: 2パターンを並列生成
      const [genA, genB] = await Promise.all([
        generateOne(buildUserPrompt({ topic, genre, targetAudience, duration, tone, keywords, variant: "A" })),
        generateOne(buildUserPrompt({ topic, genre, targetAudience, duration, tone, keywords, variant: "B" })),
      ]);
      return NextResponse.json({ abTest: true, variantA: genA, variantB: genB });
    }

    const userPrompt = buildUserPrompt({ topic, genre, targetAudience, duration, tone, keywords });
    const generated = await generateOne(userPrompt);

    if (projectId) {
      const script = await prisma.script.create({
        data: {
          projectId,
          title: generated.title,
          topic,
          hook: generated.hook,
          body: generated.body,
          callToAction: generated.callToAction,
          hashtags: generated.hashtags,
          duration: generated.estimatedDuration,
          status: "draft",
          aiModel: "claude-opus-4-7",
          prompt: userPrompt,
          scenes: {
            create: (generated.scenes || []).map((s: { text: string; visualNote: string; duration: number }, i: number) => ({
              order: i + 1,
              text: s.text,
              visualNote: s.visualNote,
              duration: s.duration,
            })),
          },
        },
        include: { scenes: true },
      });
      return NextResponse.json({ script, generated });
    }

    return NextResponse.json({ generated });
  } catch (error) {
    // Expose only known safe messages; suppress SDK/network internals
    const raw = error instanceof Error ? error.message : "";
    const knownMessages = ["Anthropic API keyが設定されていません。設定ページで登録してください。", "JSONの解析に失敗しました", "予期しないレスポンス形式", "topic is required"];
    const message = knownMessages.includes(raw) ? raw : "台本の生成中にエラーが発生しました。しばらくしてから再試行してください。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
