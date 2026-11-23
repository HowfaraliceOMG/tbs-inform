import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { regenerateProductsJson } from "@/lib/shop/products-override";
import { logAdminAction } from "@/lib/shop/admin-settings";
import { PRODUCT_VIDEOS } from "@/lib/shop/videos";
import baseProducts from "@/data/products.base.json";
import type { ShopProduct } from "@/lib/shop/data";

export const dynamic = "force-dynamic";

/**
 * Импорт каталога из JSON (дополнение к экспорту ?what=catalog):
 *  • товары, которых нет в эталоне, создаются как новые (нужны name, brand,
 *    категории и главное фото);
 *  • существующие товары обновляются только там, где значение файла отличается
 *    от эталона — ручные правки админа в остальных полях не затираются.
 *
 * Формат записи — как в экспорте каталога: { slug, name, short, brand, cats,
 * img, hover, gallery, ru/uz/en (строка или массив абзацев), video, videoTitle,
 * hidden }. Принимается JSON-массив или { products: [...] }.
 */

const CAT_SLUGS = ["lyubitelskie", "portativnye", "mobilnye", "analogovye", "poc", "retranslyatory"];

/** YouTube-ID из ссылки (watch?v=, youtu.be/, shorts/, embed/) или голого ID */
function ytId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

const langText = z.union([z.string().max(20000), z.array(z.string().max(5000)).max(100)]);

const itemSchema = z.object({
  slug: z.string().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "недопустимый slug"),
  name: z.string().max(300).optional(),
  short: z.string().max(300).optional(),
  brand: z.string().max(100).optional(),
  cats: z.union([z.array(z.string().max(60)).max(7), z.string().max(300)]).optional(),
  img: z.string().max(300).optional(),
  hover: z.string().max(300).optional(),
  gallery: z.union([z.array(z.string().max(300)).max(30), z.string().max(20000)]).optional(),
  ru: langText.optional(),
  uz: langText.optional(),
  en: langText.optional(),
  video: z.string().max(300).optional(),
  videoTitle: z
    .object({
      ru: z.string().max(300).optional(),
      uz: z.string().max(300).optional(),
      en: z.string().max(300).optional(),
    })
    .optional(),
  hidden: z.boolean().optional(),
});

/** Строка или массив абзацев → текст с пустыми строками между абзацами */
function toText(v: string | string[] | undefined): string | null {
  if (v == null) return null;
  const s = Array.isArray(v)
    ? v.map((t) => String(t).trim()).filter(Boolean).join("\n\n")
    : v.trim();
  return s || null;
}

/** Массив или JSON-строка → чистый массив локальных путей галереи */
function toGallery(v: string[] | string | undefined): string[] | null {
  if (v == null) return null;
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      arr = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr)) return null;
  const clean = arr
    .filter((x): x is string => typeof x === "string" && x.trim().startsWith("/"))
    .map((x) => x.trim());
  return clean.length ? clean : null;
}

/** Массив, JSON-строка или "a,b" → валидные слаги категорий */
function toCats(v: string[] | string | undefined): string[] {
  if (v == null) return [];
  let arr: unknown = v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) arr = p;
      else arr = v.split(/[,\s]+/);
    } catch {
      arr = v.split(/[,\s]+/);
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === "string" && (CAT_SLUGS as string[]).includes(x.trim())).map((x) => x.trim());
}

/** Отличается ли импортируемое значение от эталона (иначе — не трогаем поле) */
function diffText(v: string | null, base: string): string | null {
  return v != null && v !== base ? v : null;
}

function cleanVideoTitle(
  vt: { ru?: string; uz?: string; en?: string } | undefined,
): string | null {
  if (!vt) return null;
  const ru = vt.ru?.trim() ?? "";
  const uz = vt.uz?.trim() ?? "";
  const en = vt.en?.trim() ?? "";
  return ru || uz || en ? JSON.stringify({ ru, uz, en }) : null;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "VALIDATION", hint: "Ожидается JSON-массив товаров или { products: [...] }" },
      { status: 400 },
    );
  }
  const list: unknown = Array.isArray(body) ? body : (body as { products?: unknown })?.products;
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION", hint: "Файл не содержит массив товаров" },
      { status: 400 },
    );
  }
  if (list.length > 500) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION", hint: "За один импорт — не более 500 товаров" },
      { status: 400 },
    );
  }

  const errors: { slug?: string; error: string }[] = [];
  const items: z.infer<typeof itemSchema>[] = [];
  for (const raw of list) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) {
      const slug = typeof (raw as { slug?: unknown })?.slug === "string" ? (raw as { slug: string }).slug : undefined;
      errors.push({ slug, error: "невалидная запись (проверьте формат полей)" });
      continue;
    }
    items.push(parsed.data);
  }

  const baseMap = new Map<string, ShopProduct>((baseProducts as ShopProduct[]).map((p) => [p.slug, p]));
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    for (const it of items) {
      const base = baseMap.get(it.slug);

      if (base) {
        // Существующий товар: правим только отличия от эталона
        const name = diffText(it.name?.trim() ?? null, base.name);
        const short = diffText(it.short?.trim() ?? null, base.short);
        const ru = diffText(toText(it.ru), base.ru.join("\n\n"));
        const uz = diffText(toText(it.uz), base.uz.join("\n\n"));
        const en = diffText(toText(it.en), base.en.join("\n\n"));
        const img = diffText(it.img?.trim() ?? null, base.img);
        const hover = diffText(it.hover?.trim() ?? null, base.hover);
        const gal = toGallery(it.gallery);
        const gallery = gal && JSON.stringify(gal) !== JSON.stringify(base.gallery) ? JSON.stringify(gal) : null;

        let video: string | null = null;
        if (it.video != null) {
          const s = it.video.trim();
          if (s === "none") video = "";
          else if (s) {
            const id = ytId(s);
            const baseYt = PRODUCT_VIDEOS[it.slug]?.yt ?? "";
            if (id && id !== baseYt) video = id;
          }
        }
        const videoTitle = cleanVideoTitle(it.videoTitle);
        const hide = it.hidden === true;

        const createData = { name, short, ru, uz, en, img, hover, gallery, video, videoTitle };
        const updateData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(createData)) {
          if (v !== null) updateData[k] = v;
        }
        if (hide) updateData.hidden = true;
        if (Object.keys(updateData).length === 0) {
          unchanged++;
          continue;
        }
        const existing = await db.productOverride.findUnique({ where: { slug: it.slug } });
        if (existing) {
          await db.productOverride.update({ where: { slug: it.slug }, data: updateData });
        } else {
          await db.productOverride.create({ data: { slug: it.slug, ...createData, hidden: hide } });
        }
        updated++;
      } else {
        // Новый товар: обязательны название, бренд, категория и главное фото
        const cats = toCats(it.cats);
        const img = it.img?.trim() || null;
        const gal = toGallery(it.gallery);
        if (!it.name?.trim() || !it.brand?.trim() || !cats.length || (!img && !(gal && gal.length))) {
          errors.push({
            slug: it.slug,
            error: "для нового товара нужны: название, бренд, категория и главное фото",
          });
          continue;
        }
        let video: string | null = null;
        if (it.video != null) {
          const s = it.video.trim();
          if (s === "none") video = "";
          else if (s) video = ytId(s);
        }
        const data = {
          name: it.name.trim(),
          short: it.short?.trim() || null,
          brand: it.brand.trim(),
          cats: JSON.stringify(cats),
          ru: toText(it.ru),
          uz: toText(it.uz),
          en: toText(it.en),
          img,
          hover: it.hover?.trim() || null,
          gallery: gal ? JSON.stringify(gal) : null,
          video,
          videoTitle: cleanVideoTitle(it.videoTitle),
          hidden: it.hidden === true,
        };
        const existing = await db.productOverride.findUnique({ where: { slug: it.slug } });
        if (existing) {
          await db.productOverride.update({ where: { slug: it.slug }, data });
          updated++;
        } else {
          await db.productOverride.create({ data: { slug: it.slug, ...data } });
          created++;
        }
      }
    }

    const count = await regenerateProductsJson();
    const parts = [`новых: ${created}`, `обновлено: ${updated}`, `без изменений: ${unchanged}`];
    if (errors.length) parts.push(`ошибок: ${errors.length}`);
    await logAdminAction("Импорт каталога", parts.join(", "));
    return NextResponse.json({ ok: true, created, updated, unchanged, errors, visibleProducts: count });
  } catch (e) {
    console.error("Admin import error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
