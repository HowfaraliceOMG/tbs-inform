import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  path: z.string().min(1).max(300).optional(),
  query: z.string().min(1).max(200).optional(), // поисковый запрос (живой поиск)
  lang: z.string().max(10).optional().nullable(),
  device: z.string().max(10).optional().nullable(),
  ref: z.string().max(200).optional().nullable(),
  anon: z.string().max(100).optional().nullable(),
});

// POST /api/track — фиксация просмотра страницы (beacon с PageTracker) или
// поискового запроса (beacon с LiveSearch). Публичный эндпоинт, пишет только
// факт; админ-страницы не трекаем.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const { path, query, lang, device, ref, anon } = parsed.data;
    if (path?.startsWith("/sluzhebnoe")) return NextResponse.json({ ok: true });

    if (query) {
      // Поиск: нормализуем и пишем в SearchLog (обзор админки → «поисковые запросы»)
      const q = query.trim().toLowerCase().slice(0, 200);
      if (q.length >= 2) {
        await db.searchLog.create({ data: { query: q, lang: lang || null, anon: anon || null } });
      }
      return NextResponse.json({ ok: true });
    }

    if (!path || !path.startsWith("/")) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await db.pageView.create({
      data: {
        path,
        lang: lang || null,
        device: device || null,
        ref: ref || null,
        anon: anon || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // трекинг не должен ломать страницу при ошибке
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
