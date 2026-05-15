import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const analytics = await prisma.analytics.findMany({
      include: {
        postSchedule: {
          select: { platform: true, title: true, scheduledAt: true, postedAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const totals = await prisma.analytics.aggregate({
      _sum: { views: true, likes: true, comments: true, shares: true, follows: true, revenue: true },
    });

    const byPlatform = await prisma.analytics.groupBy({
      by: ["platform"],
      _sum: { views: true, likes: true, revenue: true },
    });

    return NextResponse.json({ analytics, totals: totals._sum, byPlatform });
  } catch (e) {
    console.error("[GET /api/analytics]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = await prisma.analytics.upsert({
      where: { postScheduleId: body.postScheduleId },
      create: {
        postScheduleId: body.postScheduleId,
        platform: body.platform,
        views: body.views || 0,
        likes: body.likes || 0,
        comments: body.comments || 0,
        shares: body.shares || 0,
        follows: body.follows || 0,
        reach: body.reach || 0,
        impressions: body.impressions || 0,
        revenue: body.revenue || 0,
      },
      update: {
        views: body.views,
        likes: body.likes,
        comments: body.comments,
        shares: body.shares,
        follows: body.follows,
        reach: body.reach,
        impressions: body.impressions,
        revenue: body.revenue,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error("[POST /api/analytics]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
