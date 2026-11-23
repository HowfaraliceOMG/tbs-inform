import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/sluzhebnoe/stats — статистика посещаемости + популярные поисковые
 * запросы. Дни считаются по времени Ташкента (UTC+5).
 * ?format=csv — выгрузка 30-дневной серии в CSV.
 */

const TZ_OFFSET = 5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Локальная (ташкентская) дата строки yyyy-mm-dd для timestamp
const dayKey = (ts: number) => new Date(ts + TZ_OFFSET).toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const now = Date.now();
    const since30 = new Date(now - 30 * DAY);

    const [views, total, searches, vitalsRows] = await Promise.all([
      db.pageView.findMany({
        where: { createdAt: { gte: since30 } },
        select: { path: true, lang: true, device: true, ref: true, anon: true, createdAt: true },
      }),
      db.pageView.count(),
      db.searchLog.groupBy({
        by: ["query"],
        where: { createdAt: { gte: since30 } },
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: 10,
      }),
      // Фактическая скорость (RUM): сырые метрики за 30 дней, p75 ниже
      db.webVitals.findMany({
        where: { createdAt: { gte: since30 } },
        select: { device: true, ttfb: true, fcp: true, lcp: true, inp: true, cls: true },
      }),
    ]);

    const todayKey = dayKey(now);
    const yesterdayKey = dayKey(now - DAY);
    const localMidnight = Date.parse(todayKey) - TZ_OFFSET;

    const byDay = new Map<string, number>();
    const byPath = new Map<string, number>();
    const byRef = new Map<string, number>();
    const byDevice = new Map<string, number>();
    const byLang = new Map<string, number>();
    const anons24 = new Set<string>();
    const anons30 = new Set<string>();
    let online = 0;

    for (const v of views) {
      const ts = v.createdAt.getTime();
      const key = dayKey(ts);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
      byPath.set(v.path, (byPath.get(v.path) ?? 0) + 1);
      if (v.ref) byRef.set(v.ref, (byRef.get(v.ref) ?? 0) + 1);
      if (v.device) byDevice.set(v.device, (byDevice.get(v.device) ?? 0) + 1);
      if (v.lang) byLang.set(v.lang, (byLang.get(v.lang) ?? 0) + 1);
      if (v.anon) {
        if (ts >= now - DAY) anons24.add(v.anon);
        anons30.add(v.anon);
      }
      if (ts >= now - 5 * 60_000) online += 1;
    }

    const sum = (from: number) => views.filter((v) => v.createdAt.getTime() >= from).length;

    // Серия за 30 дней: от сегодня-29 до сегодня, дни без просмотров = 0
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = dayKey(now - i * DAY);
      days.push({ date: key, count: byDay.get(key) ?? 0 });
    }

    const top = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => ({ key: k, count: c }));

    const searchTerms = searches.map((s) => ({ key: s.query, count: s._count.query }));

    // Фактическая скорость: p75 (75-й перцентиль, nearest-rank) — по той же
    // метрике, по которой Google судит сайт в Core Web Vitals.
    const p75 = (vals: number[]) => {
      if (vals.length === 0) return null;
      const sorted = [...vals].sort((a, b) => a - b);
      return sorted[Math.ceil(0.75 * sorted.length) - 1];
    };
    type VitalRow = (typeof vitalsRows)[number];
    type P75 = { ttfb: number | null; fcp: number | null; lcp: number | null; inp: number | null; cls: number | null };
    const vitalsOf = (rows: VitalRow[]): P75 => ({
      ttfb: p75(rows.map((r) => r.ttfb).filter((v): v is number => v != null)),
      fcp: p75(rows.map((r) => r.fcp).filter((v): v is number => v != null)),
      lcp: p75(rows.map((r) => r.lcp).filter((v): v is number => v != null)),
      inp: p75(rows.map((r) => r.inp).filter((v): v is number => v != null)),
      cls: p75(rows.map((r) => r.cls).filter((v): v is number => v != null)),
    });
    const vitals = {
      n: vitalsRows.length,
      all: vitalsOf(vitalsRows),
      mobile: vitalsOf(vitalsRows.filter((r) => r.device === "mobile")),
      desktop: vitalsOf(vitalsRows.filter((r) => r.device === "desktop")),
    };

    // ?format=csv — CSV-выгрузка: просмотры по дням за 30 дней
    if (req.nextUrl.searchParams.get("format") === "csv") {
      const csv = "date,views\n" + days.map((d) => `${d.date},${d.count}`).join("\n");
      return new NextResponse("\uFEFF" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tbs-stats-${todayKey}.csv"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      today: sum(localMidnight),
      yesterday: byDay.get(yesterdayKey) ?? 0,
      d7: sum(now - 7 * DAY),
      d30: views.length,
      total,
      online,
      unique24: anons24.size,
      unique30: anons30.size,
      days,
      topPages: top(byPath, 10),
      refs: top(byRef, 8),
      devices: top(byDevice, 3),
      langs: top(byLang, 3),
      searchTerms,
      vitals,
    });
  } catch (e) {
    console.error("Admin stats error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
