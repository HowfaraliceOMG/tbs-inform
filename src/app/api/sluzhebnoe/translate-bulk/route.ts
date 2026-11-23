import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { adminProductList, regenerateProductsJson } from "@/lib/shop/products-override";
import { countParagraphs, translateParagraphs } from "@/lib/shop/translate";
import { logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

/**
 * Пакетный автоперевод каталога: заполняет ПУСТЫЕ описания UZ/EN переводом
 * из RU по всем товарам разом. Существующие переводы не трогаются.
 *
 * Ограничения одного запуска (защита от таймаутов и лимитов переводчика):
 * не более 60 товаров и 150 абзацев; остаток возвращается в remaining —
 * кнопку достаточно нажать ещё раз.
 */

const MAX_PRODUCTS = 60;
const MAX_PARAGRAPHS = 150;

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const list = await adminProductList();
    const candidates = list.filter((p) => p.ru.trim() && (!p.uz.trim() || !p.en.trim()));

    const done: { slug: string; langs: string[] }[] = [];
    const failed: { slug: string; error: string }[] = [];
    let paragraphs = 0;
    let remaining = 0;

    for (const p of candidates) {
      if (done.length >= MAX_PRODUCTS || paragraphs >= MAX_PARAGRAPHS) {
        remaining++;
        continue;
      }
      const langs: string[] = [];
      const updateData: Record<string, string> = {};
      try {
        if (!p.uz.trim()) {
          p.uz = await translateParagraphs(p.ru, "ru", "uz");
          updateData.uz = p.uz;
          paragraphs += countParagraphs(p.ru);
          langs.push("uz");
        }
        if (!p.en.trim()) {
          p.en = await translateParagraphs(p.ru, "ru", "en");
          updateData.en = p.en;
          paragraphs += countParagraphs(p.ru);
          langs.push("en");
        }
        const existing = await db.productOverride.findUnique({ where: { slug: p.slug } });
        if (existing) {
          // Обновляем только пустые описания — имя, фото, RU и прочее не трогаем
          await db.productOverride.update({ where: { slug: p.slug }, data: updateData });
        } else {
          await db.productOverride.create({
            data: {
              slug: p.slug,
              name: null,
              short: null,
              brand: null,
              cats: null,
              ru: null,
              uz: updateData.uz ?? null,
              en: updateData.en ?? null,
              img: null,
              hover: null,
              gallery: null,
              video: null,
              videoTitle: null,
              hidden: false,
            },
          });
        }
        done.push({ slug: p.slug, langs });
      } catch {
        failed.push({ slug: p.slug, error: "перевод не удался" });
      }
    }

    if (done.length) {
      await regenerateProductsJson();
      const uz = done.filter((d) => d.langs.includes("uz")).length;
      const en = done.filter((d) => d.langs.includes("en")).length;
      await logAdminAction(
        "Пакетный перевод каталога",
        `товаров: ${done.length} (UZ: ${uz}, EN: ${en})${failed.length ? `, ошибок: ${failed.length}` : ""}`,
      );
    }

    return NextResponse.json({
      ok: true,
      done,
      failed,
      remaining,
      seconds: Math.round((Date.now() - started) / 1000),
    });
  } catch (e) {
    console.error("Admin translate-bulk error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
