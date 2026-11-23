import { NextRequest, NextResponse } from "next/server";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { isAdmin } from "@/lib/shop/admin-auth";
import { adminProductList } from "@/lib/shop/products-override";
import { adminSiteData } from "@/lib/shop/site-content";
import { logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/sluzhebnoe/images-check — проверка изображений («Настройки»).
 * Собирает все пути к картинкам сайта (главное/второе фото и галереи товаров,
 * слайдер, логотипы клиентов, баннеры категорий и другие разделы контента) и
 * проверяет, что файл существует в public/. Возвращает список отсутствующих.
 */

const IMG_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const PUBLIC_DIR = join(process.cwd(), "public");

type Missing = { path: string; where: string };

async function exists(p: string): Promise<boolean> {
  const candidates = [p];
  const dec = decodeURI(p);
  if (dec !== p) candidates.push(dec);
  for (const c of candidates) {
    try {
      await access(join(PUBLIC_DIR, c));
      return true;
    } catch {
      /* следующий вариант */
    }
  }
  return false;
}

// Рекурсивный обход JSON разделов сайта: все строки, похожие на пути картинок
function walk(value: unknown, hits: string[]) {
  if (typeof value === "string") {
    if (value.startsWith("/") && IMG_RE.test(value)) hits.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) walk(v, hits);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) walk(v, hits);
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const missing: Missing[] = [];
    let checked = 0;

    // 1) Товары: главное фото, фото при наведении, галерея
    const products = await adminProductList();
    for (const p of products) {
      const places: [string, string][] = [
        [p.img, `товар ${p.slug} — главное фото`],
        ...(p.hover ? ([[p.hover, `товар ${p.slug} — фото при наведении`]] as [string, string][]) : []),
        ...p.gallery.map((g) => [g, `товар ${p.slug} — галерея`] as [string, string]),
      ];
      for (const [raw, where] of places) {
        if (!raw || raw.startsWith("http")) continue;
        checked += 1;
        if (!(await exists(raw))) missing.push({ path: raw, where });
      }
    }

    // 2) Разделы сайта (шаблон + контент): слайдер, логотипы, баннеры…
    const site = await adminSiteData();
    const sitePaths: string[] = [];
    for (const s of Object.values(site)) walk(s.data, sitePaths);
    const uniq = [...new Set(sitePaths)];
    for (const raw of uniq) {
      checked += 1;
      if (!(await exists(raw))) missing.push({ path: raw, where: "шаблон / контент сайта" });
    }

    await logAdminAction("Проверка изображений", missing.length ? `не найдено: ${missing.length}` : "все на месте");
    return NextResponse.json({ ok: true, checked, missing });
  } catch (e) {
    console.error("Admin images-check error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
