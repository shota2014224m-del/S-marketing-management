import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const settings = await prisma.settings.findMany();
  const result: Record<string, string> = {};
  for (const s of settings) {
    // Mask secret keys in response
    result[s.key] = s.key.includes("api_key") && s.value
      ? s.value.slice(0, 8) + "••••••••"
      : s.value;
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const results = await Promise.all(
    Object.entries(body as Record<string, string>).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
  return NextResponse.json({ ok: true, count: results.length });
}
