import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { buildBackupPayload } from "@/lib/shop/backup-data";
import { regenerateProductsJson } from "@/lib/shop/products-override";
import { regenerateSiteJson } from "@/lib/shop/site-content";
import { regenerateSeoJson } from "@/lib/shop/seo-db";
import { regenerateSpecsJson } from "@/lib/shop/specs-override";
import { logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

/**
 * Резервная копия данных панели (вкладка «Настройки» → «Резервная копия»).
 *  • GET  — скачать JSON: правки товаров, характеристики, контент сайта,
 *           SEO-теги, заявки, отзывы
 *  • POST — восстановить из JSON (файл создаётся GET-ом этого же роута,
 *           это же — файлы автобэкапа db/backups)
 *
 * Статистика (PageView/SearchLog) в копию не входит — она очищается
 * через «Настройки» → «Очистка статистики».
 */

const restoreSchema = z.object({
  productOverrides: z
    .array(
      z.object({
        slug: z.string().min(1).max(200),
        name: z.string().max(300).nullable().optional(),
        short: z.string().max(300).nullable().optional(),
        brand: z.string().max(100).nullable().optional(),
        cats: z.string().nullable().optional(), // JSON-массив категорий
        ru: z.string().max(20000).nullable().optional(),
        uz: z.string().max(20000).nullable().optional(),
        en: z.string().max(20000).nullable().optional(),
        img: z.string().max(300).nullable().optional(),
        hover: z.string().max(300).nullable().optional(),
        gallery: z.string().nullable().optional(),
        hidden: z.boolean().nullable().optional(),
      }),
    )
    .max(2000),
  siteOverrides: z.array(z.object({ key: z.string().min(1).max(60), data: z.string().max(2_000_000) })).max(60),
  seoOverrides: z
    .array(
      z.object({
        path: z.string().startsWith("/").min(1).max(300),
        title: z.string().max(200).nullable().optional(),
        description: z.string().max(1000).nullable().optional(),
        keywords: z.string().max(500).nullable().optional(),
      }),
    )
    .max(2000)
    .optional(), // старые бэкапы (version 1) без SEO восстанавливаются как есть
  leads: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().max(120),
        phone: z.string().max(40),
        message: z.string().max(2000).nullable().optional(),
        product: z.string().max(200).nullable().optional(),
        done: z.boolean().nullable().optional(),
        createdAt: z.string(),
      }),
    )
    .max(5000),
  specOverrides: z
    .array(
      z.object({
        slug: z.string().min(1).max(200),
        table: z.string().max(400_000).nullable().optional(), // JSON SpecGroup[]
        facets: z.string().max(10_000).nullable().optional(), // JSON теги фасетов
      }),
    )
    .max(2000)
    .optional(), // копии версии 2 без характеристик восстанавливаются как есть
  reviews: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        productSlug: z.string().min(1).max(200),
        name: z.string().max(120),
        rating: z.number().int().min(1).max(5),
        text: z.string().max(4000),
        hidden: z.boolean().nullable().optional(),
        createdAt: z.string(),
      }),
    )
    .max(5000),
});

const iso = () => new Date().toISOString().slice(0, 19).replaceAll(":", "-");

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const payload = await buildBackupPayload();
  return new NextResponse(JSON.stringify(payload, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tbs-backup-${iso()}.json"`,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const parsed = restoreSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const { productOverrides, siteOverrides, seoOverrides = [], specOverrides = [], leads, reviews } = parsed.data;

    // Полное восстановление: текущие данные заменяются содержимым файла
    await db.$transaction([
      db.productOverride.deleteMany(),
      db.siteOverride.deleteMany(),
      db.seoOverride.deleteMany(),
      db.specOverride.deleteMany(),
      db.lead.deleteMany(),
      db.review.deleteMany(),
      db.productOverride.createMany({
        data: productOverrides.map((o) => ({
          slug: o.slug,
          name: o.name ?? null,
          short: o.short ?? null,
          brand: o.brand ?? null,
          cats: o.cats ?? null,
          ru: o.ru ?? null,
          uz: o.uz ?? null,
          en: o.en ?? null,
          img: o.img ?? null,
          hover: o.hover ?? null,
          gallery: o.gallery ?? null,
          hidden: o.hidden ?? false,
        })),
      }),
      db.siteOverride.createMany({ data: siteOverrides.map((s) => ({ key: s.key, data: s.data })) }),
      db.seoOverride.createMany({
        data: seoOverrides.map((s) => ({
          path: s.path,
          title: s.title ?? null,
          description: s.description ?? null,
          keywords: s.keywords ?? null,
        })),
      }),
      db.specOverride.createMany({
        data: specOverrides.map((s) => ({
          slug: s.slug,
          table: s.table ?? null,
          facets: s.facets ?? null,
        })),
      }),
      db.lead.createMany({
        data: leads.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          message: l.message ?? null,
          product: l.product ?? null,
          done: l.done ?? false,
          createdAt: new Date(l.createdAt),
        })),
      }),
      db.review.createMany({
        data: reviews.map((r) => ({
          id: r.id,
          productSlug: r.productSlug,
          name: r.name,
          rating: r.rating,
          text: r.text,
          hidden: r.hidden ?? false,
          createdAt: new Date(r.createdAt),
        })),
      }),
    ]);

    // После восстановления — перегенерация рабочих файлов сайта
    const [, , seoCount, specsCount] = await Promise.all([
      regenerateSiteJson(),
      regenerateProductsJson(),
      regenerateSeoJson(),
      regenerateSpecsJson(),
    ]);
    await logAdminAction(
      "Восстановление из резервной копии",
      `товары: ${productOverrides.length}, секции: ${siteOverrides.length}, характеристики: ${specOverrides.length}`,
    );

    return NextResponse.json({
      ok: true,
      restored: {
        products: productOverrides.length,
        sections: siteOverrides.length,
        seoPaths: seoCount,
        specs: specsCount,
        leads: leads.length,
        reviews: reviews.length,
        visibleProducts: productOverrides.length,
      },
    });
  } catch (e) {
    console.error("Admin backup restore error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
