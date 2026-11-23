import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ms = z.number().min(0).max(600_000).nullable();
const schema = z.object({
  path: z.string().min(1).max(300),
  lang: z.string().max(10).nullable().optional(),
  device: z.string().max(10).nullable().optional(),
  anon: z.string().max(100).nullable().optional(),
  ttfb: ms.optional(),
  fcp: ms.optional(),
  lcp: ms.optional(),
  inp: ms.optional(),
  cls: z.number().min(0).max(1000).nullable().optional(),
});

// POST /api/vitals — фактическая скорость (Core Web Vitals) от реальных
// посетителей: beacon со сборщика в layout при уходе со страницы (или при
// сворачивании вкладки). Публичный эндпоинт, пишет только метрики; админ-
// страницы сборщик не измеряет. p75 агрегирует /api/sluzhebnoe/stats.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const { path, lang, device, anon, ttfb, fcp, lcp, inp, cls } = parsed.data;
    if (path.startsWith("/sluzhebnoe")) return NextResponse.json({ ok: true });

    await db.webVitals.create({
      data: {
        path,
        lang: lang ?? null,
        device: device ?? null,
        anon: anon ?? null,
        ttfb: ttfb ?? null,
        fcp: fcp ?? null,
        lcp: lcp ?? null,
        inp: inp ?? null,
        cls: cls ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // замеры не должны ломать страницу при ошибке
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
