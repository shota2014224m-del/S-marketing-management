import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TAG_MAX_LEN = 100;

export async function GET() {
  const hashtags = await prisma.hashtag.findMany({ orderBy: { usageCount: "desc" } });
  return NextResponse.json(hashtags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Bulk import from scripts scan
  if (body.action === "scan") {
    const scripts = await prisma.script.findMany({ select: { hashtags: true } });
    // Use Map to avoid prototype pollution on plain objects
    const tagCounts = new Map<string, number>();
    for (const s of scripts) {
      if (!s.hashtags) continue;
      const tags = s.hashtags.match(/#[\w぀-鿿゠-ヿ]+/g) || [];
      for (const t of tags) {
        if (t.length > TAG_MAX_LEN) continue;
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    let added = 0;
    for (const [tag, count] of tagCounts) {
      await prisma.hashtag.upsert({
        where: { tag },
        update: { usageCount: count },
        create: { tag, usageCount: count },
      });
      added++;
    }
    return NextResponse.json({ added });
  }

  const { tag, category, platform, notes } = body;
  if (!tag || typeof tag !== "string") return NextResponse.json({ error: "tag is required" }, { status: 400 });
  if (tag.length > TAG_MAX_LEN) return NextResponse.json({ error: "タグが長すぎます" }, { status: 400 });

  const normalised = tag.startsWith("#") ? tag : `#${tag}`;
  try {
    const hashtag = await prisma.hashtag.create({ data: { tag: normalised, category, platform, notes } });
    return NextResponse.json(hashtag, { status: 201 });
  } catch {
    return NextResponse.json({ error: "このタグは既に登録されています" }, { status: 409 });
  }
}
