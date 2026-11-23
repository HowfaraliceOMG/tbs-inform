import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/reviews/stats — агрегированный рейтинг по всем товарам сразу
// (для звёзд на карточках каталога без лишних запросов)
export async function GET() {
  try {
    const rows = await db.review.groupBy({
      by: ["productSlug"],
      where: { hidden: false },
      _count: { _all: true },
      _avg: { rating: true },
    });
    const stats: Record<string, { count: number; avg: number }> = {};
    for (const r of rows) {
      stats[r.productSlug] = { count: r._count._all, avg: Math.round((r._avg.rating ?? 0) * 10) / 10 };
    }
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    console.error("Review stats error:", e);
    return NextResponse.json({ ok: false, stats: {} }, { status: 500 });
  }
}
