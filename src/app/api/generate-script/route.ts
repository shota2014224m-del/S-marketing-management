import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topic, genre, targetAudience, duration = 60, tone, keywords, projectId } = body;

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const settingRow = await prisma.settings.findUnique({ where: { key: "anthropic_api_key" } });
    if (!settingRow?.value) {
      return NextResponse.json(
        { error: "Anthropic API keyが設定されていません。設定ページで登録してください。" },
        { status: 400 }
      );
    }
    (client as unknown as { apiKey: string }).apiKey = settingRow.value;
  }

  const systemPrompt = `あなたはSNSショート動画（TikTok・YouTube Shorts・Instagram Reels）の台本作成の専門家です。
バイラルを狙える、視聴者を引きつけるスクリプトを日本語で作成してください。

出力は必ず以下のJSON形式で返してください：
{
  "title": "動画タイトル",
  "hook": "最初の3秒で視聴者を引きつけるフック（1〜2文）",
  "body": "メイン本文（全体の台本テキスト）",
  "callToAction": "最後のCTA（フォロー・いいね・コメント誘導）",
  "hashtags": "#タグ1 #タグ2 #タグ3 ...",
  "estimatedDuration": 動画の推定秒数,
  "scenes": [
    {
      "order": 1,
      "text": "このシーンのセリフ・ナレーション",
      "visualNote": "画像生成用のビジュアル指示（英語で）",
      "duration": シーン秒数
    }
  ]
}`;

  const userPrompt = `以下の条件でショート動画の台本を作成してください：

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
- シーンは5〜8個に分割し、各シーンに画像生成向けのビジュアル指示も含める`;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "予期しないレスポンス形式" }, { status: 500 });
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "JSONの解析に失敗しました" }, { status: 500 });
    }

    const generated = JSON.parse(jsonMatch[0]);

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
    const message = error instanceof Error ? error.message : "生成中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
