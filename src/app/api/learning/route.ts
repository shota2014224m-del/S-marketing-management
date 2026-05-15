import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

async function getObsidianVaultPath(): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key: "obsidian_vault_path" } });
  return row?.value || null;
}

function toSlug(str: string) {
  return str.slice(0, 40).replace(/[^\w぀-鿿]/g, "_");
}

function buildMarkdown(p: {
  type: string; title: string; topic?: string | null; genre?: string | null;
  keywords?: string | null; viralScore?: number | null; hook?: string | null;
  structure?: string | null; promptCore?: string | null; outputSample?: string | null;
  learnings?: string | null;
}, createdAt: string): string {
  const typeLabel = p.type === "script" ? "台本" : p.type === "image" ? "画像" : "動画";
  const lines: string[] = [
    "---",
    `type: ${p.type}`,
    `title: "${p.title}"`,
    p.topic ? `topic: "${p.topic}"` : null,
    p.genre ? `genre: "${p.genre}"` : null,
    p.keywords ? `keywords: "${p.keywords}"` : null,
    p.viralScore != null ? `viral_score: ${p.viralScore}` : null,
    `created: "${createdAt.split("T")[0]}"`,
    "---",
    "",
    `# ${p.title}`,
    "",
  ].filter((l) => l !== null) as string[];

  if (p.learnings) {
    lines.push(`## なぜこの${typeLabel}が機能したか`, "", p.learnings, "");
  }
  if (p.hook) {
    lines.push("## フックパターン", "", p.hook, "");
  }
  if (p.structure) {
    lines.push("## 構成パターン", "", p.structure, "");
  }
  if (p.promptCore) {
    lines.push(`## ${p.type === "script" ? "効果的なプロンプト要素" : "プロンプト"}`, "", p.promptCore, "");
  }
  if (p.outputSample) {
    lines.push("## 出力サンプル（抜粋）", "", "```", p.outputSample, "```", "");
  }
  if (p.keywords) {
    lines.push("## タグ", "", p.keywords.split(/[,\s]+/).filter(Boolean).map((k) => `#${k}`).join(" "), "");
  }

  return lines.join("\n");
}

async function writeToObsidian(
  vaultPath: string, pattern: Parameters<typeof buildMarkdown>[0] & { id: string },
  createdAt: string
): Promise<string> {
  const typeDir = pattern.type === "script" ? "台本パターン" : pattern.type === "image" ? "画像プロンプトパターン" : "動画プロンプトパターン";
  const dir = path.join(vaultPath, "SNS動画マネジメント", typeDir);
  await fs.mkdir(dir, { recursive: true });

  const slug = toSlug(pattern.topic || pattern.title);
  const date = createdAt.split("T")[0].replace(/-/g, "");
  const filename = `${slug}_${date}.md`;
  const filepath = path.join(dir, filename);

  await fs.writeFile(filepath, buildMarkdown(pattern, createdAt), "utf-8");
  return path.join("SNS動画マネジメント", typeDir, filename);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const genre = searchParams.get("genre");
    const keywords = searchParams.get("keywords");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (genre) where.genre = genre;
    if (keywords) {
      const term = keywords.split(/[\s,]+/).filter(Boolean)[0] ?? "";
      where.OR = [
        { keywords: { contains: term } },
        { topic: { contains: term } },
        { title: { contains: term } },
      ];
    }

    const patterns = await prisma.learningPattern.findMany({
      where,
      orderBy: [{ viralScore: "desc" }, { usageCount: "desc" }, { createdAt: "desc" }],
      take: 20,
    });
    return NextResponse.json(patterns);
  } catch (e) {
    console.error("[GET /api/learning]", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, topic, genre, keywords, viralScore, hook, structure, promptCore, outputSample, learnings, sourceId } = body;

    if (!type || !title) return NextResponse.json({ error: "type and title are required" }, { status: 400 });

    const pattern = await prisma.learningPattern.create({
      data: { type, title, topic, genre, keywords, viralScore, hook, structure, promptCore, outputSample, learnings, sourceId },
    });

    // Write to Obsidian vault if configured
    let obsidianPath: string | null = null;
    try {
      const vaultPath = await getObsidianVaultPath();
      if (vaultPath) {
        obsidianPath = await writeToObsidian(vaultPath, { ...pattern }, pattern.createdAt.toISOString());
        await prisma.learningPattern.update({ where: { id: pattern.id }, data: { obsidianPath } });
      }
    } catch (err) {
      console.error("Obsidian write failed:", err);
      // Non-fatal: pattern is saved in DB regardless
    }

    return NextResponse.json({ ...pattern, obsidianPath }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/learning]", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
