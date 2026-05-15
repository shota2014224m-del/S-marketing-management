import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      // Mask secret keys in response
      result[s.key] = s.key.includes("api_key") && s.value
        ? s.value.slice(0, 8) + "••••••••"
        : s.value;
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/settings]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (e) {
    console.error("[POST /api/settings]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
