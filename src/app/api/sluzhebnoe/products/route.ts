import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { isCustomSlug, regenerateProductsJson } from "@/lib/shop/products-override";
import { logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

const CAT_SLUGS = ["lyubitelskie", "portativnye", "mobilnye", "analogovye", "poc", "retranslyatory"];

const videoTitleSchema = z.object({
  ru: z.string().max(300).optional(),
  uz: z.string().max(300).optional(),
  en: z.string().max(300).optional(),
});

/** YouTube-ID из ссылки (watch?v=, youtu.be/, shorts/, embed/) или голого ID */
function ytId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null; // не удалось распознать
}

const putSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: строчные латинские буквы, цифры и дефис"),
  name: z.string().max(300).optional(),
  short: z.string().max(300).optional(),
  brand: z.string().max(100).optional(), // обязателен для нового товара
  cats: z.array(z.enum(CAT_SLUGS as [string, ...string[]])).max(7).optional(), // категории нового товара
  ru: z.string().max(20000).optional(),
  uz: z.string().max(20000).optional(),
  en: z.string().max(20000).optional(),
  img: z.string().max(300).optional(), // главное фото ("" = сброс к эталону)
  hover: z.string().max(300).optional(),
  gallery: z.array(z.string().max(300)).max(30).optional(),
  video: z.string().max(300).optional(), // YouTube-ID/ссылка ("" = скрыть эталонное видео)
  videoTitle: videoTitleSchema.optional(), // подпись видео RU/UZ/EN
  hidden: z.boolean().optional(),
});

const isPath = (s: string) => s.startsWith("/");

// PUT /api/sluzhebnoe/products — сохранить правку товара (upsert) и применить на сайте.
// Если slug нет в эталоне — создаётся НОВЫЙ товар (нужны name, brand, cats, img).
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const { slug, name, short, brand, cats, ru, uz, en, img, hover, gallery, video, videoTitle, hidden } = parsed.data;

    // Новый товар: проверяем обязательные поля
    const creating = isCustomSlug(slug);
    const existing = await db.productOverride.findUnique({ where: { slug } });
    if (creating && !existing && (!name?.trim() || !brand?.trim() || !cats?.length)) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", hint: "Для нового товара нужны: название, бренд, категория" },
        { status: 400 },
      );
    }

    // Фото: путь должен быть локальным (/tbs-img/…, /uploads/…); "" = сброс
    const imgPath = img != null && img.trim() ? img.trim() : null;
    if (imgPath && !isPath(imgPath)) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const hoverPath = hover != null && hover.trim() ? hover.trim() : null;
    if (hoverPath && !isPath(hoverPath)) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const galleryPaths = gallery?.filter((s) => s.trim() && isPath(s.trim())).map((s) => s.trim());
    if (creating && !existing && !imgPath && !(galleryPaths && galleryPaths.length)) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", hint: "Для нового товара загрузите главное фото" },
        { status: 400 },
      );
    }
    // Видео: "" = сброс к эталону, "none" = скрыть (в т.ч. эталонное), иначе YouTube-ID/ссылка.
    // В БД: null = эталон, "" = скрыть, "<ID>" = своё видео.
    let videoValue: string | null = null;
    if (video != null) {
      const s = video.trim();
      if (s === "none") {
        videoValue = "";
      } else if (s !== "") {
        const id = ytId(s);
        if (id == null) {
          return NextResponse.json(
            { ok: false, error: "VALIDATION", hint: "Не удалось распознать ссылку YouTube" },
            { status: 400 },
          );
        }
        videoValue = id;
      }
    }
    const vt = videoTitle;
    const vtClean =
      vt && (vt.ru?.trim() || vt.uz?.trim() || vt.en?.trim())
        ? JSON.stringify({ ru: vt.ru?.trim() ?? "", uz: vt.uz?.trim() ?? "", en: vt.en?.trim() ?? "" })
        : null;
    const data = {
      name: name?.trim() || null,
      short: short?.trim() || null,
      brand: brand?.trim() || null,
      cats: cats ? JSON.stringify(cats) : null,
      ru: ru?.trim() || null,
      uz: uz?.trim() || null,
      en: en?.trim() || null,
      img: imgPath,
      hover: hoverPath,
      gallery: galleryPaths ? JSON.stringify(galleryPaths) : null,
      video: videoValue,
      videoTitle: vtClean,
      hidden: hidden ?? false,
    };
    await db.productOverride.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    const count = await regenerateProductsJson();
    await logAdminAction(creating && !existing ? "Создан товар" : "Сохранён товар", slug);
    return NextResponse.json({ ok: true, visibleProducts: count });
  } catch (e) {
    console.error("Admin products PUT error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

// DELETE /api/sluzhebnoe/products?slug=... — сбросить правки товара к эталону
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    await db.productOverride.delete({ where: { slug } });
    const count = await regenerateProductsJson();
    await logAdminAction(isCustomSlug(slug) ? "Удалён товар" : "Сброшен товар к эталону", slug);
    return NextResponse.json({ ok: true, visibleProducts: count });
  } catch (e) {
    console.error("Admin products DELETE error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
