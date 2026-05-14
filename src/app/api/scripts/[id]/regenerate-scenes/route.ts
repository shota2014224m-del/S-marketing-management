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

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const script = await prisma.script.findUnique({
    where: { id },
    include: { scenes: { orderBy: { order: "asc" } } },
  });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await resolveApiKey();

    const prompt = `以下のショート動画台本を5〜8個のシーンに分割してください。

タイトル: ${script.title}
フック（冒頭3秒）: ${script.hook ?? ""}
メイン台本:
${script.body ?? ""}
CTA: ${script.callToAction ?? ""}

出力は必ず以下のJSON配列のみで返してください（説明文は不要）:
[
  {
    "order": 1,
    "text": "このシーンのセリフ・ナレーション",
    "visualNote": "画像生成用のビジュアル指示（英語で、具体的に）",
    "duration": シーン秒数
  }
]

各シーンは3〜8秒程度。visualNoteは英語で詳細に記述。`;

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("予期しないレスポンス形式");

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSONの解析に失敗しました");

    const newScenes: { order: number; text: string; visualNote: string; duration: number }[] = JSON.parse(jsonMatch[0]);

    // Null out imageAsset refs for old scenes, then delete them
    const oldSceneIds = script.scenes.map((s) => s.id);
    if (oldSceneIds.length > 0) {
      await prisma.imageAsset.updateMany({ where: { sceneId: { in: oldSceneIds } }, data: { sceneId: null } });
      await prisma.scriptScene.deleteMany({ where: { scriptId: id } });
    }

    await prisma.scriptScene.createMany({
      data: newScenes.map((s, i) => ({
        scriptId: id,
        order: i + 1,
        text: s.text,
        visualNote: s.visualNote,
        duration: s.duration,
      })),
    });

    const updated = await prisma.script.findUnique({
      where: { id },
      include: {
        project: { select: { title: true } },
        scenes: { orderBy: { order: "asc" } },
        imageAssets: true,
        videoAssets: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const safe = ["Anthropic API keyが設定されていません。設定ページで登録してください。", "JSONの解析に失敗しました", "予期しないレスポンス形式"];
    return NextResponse.json({ error: safe.includes(msg) ? msg : "シーン再生成中にエラーが発生しました" }, { status: 500 });
  }
}
