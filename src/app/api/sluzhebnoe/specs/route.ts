import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { logAdminAction } from "@/lib/shop/admin-settings";
import { bySlug } from "@/lib/shop/data";
import { parseSpecs } from "@/lib/shop/specs";
import {
  adminSpecsList,
  effectiveSpecFacets,
  effectiveSpecTable,
  parseSpecFacets,
  parseSpecTable,
  regenerateSpecsJson,
} from "@/lib/shop/specs-override";

export const dynamic = "force-dynamic";

/**
 * Редактор характеристик (вкладка «Характеристики» + быстрый редактор
 * в карточке товара):
 *  • GET          — список товаров: есть ли таблица/теги фильтров, изменено ли;
 *  • GET ?slug=x  — эффективные таблица + теги фасетов одного товара; если
 *                   таблицы нет, дополнительно отдаёт parsed — строки,
 *                   собранные из раздела «Особенности» описания (шаблон для
 *                   быстрого редактора);
 *  • PUT          — сохранить правку (table/facets целиком; null — убрать правку);
 *  • DELETE ?slug=x — сбросить правку к эталону (удалить запись).
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const groupSchema = z.object({
  group: z.string().min(1).max(120),
  rows: z
    .array(z.object({ label: z.string().min(1).max(150), value: z.string().min(1).max(600) }))
    .max(80),
});

const putSchema = z.object({
  slug: z.string().regex(SLUG_RE).max(200),
  table: z.array(groupSchema).max(30).nullable(),
  facets: z.record(z.string().max(40), z.array(z.string().max(40)).max(20)).nullable(),
});

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    const items = await adminSpecsList();
    return NextResponse.json({ ok: true, items });
  }
  const row = await db.specOverride.findUnique({ where: { slug } });
  const table = effectiveSpecTable(slug, row);
  const facets = effectiveSpecFacets(slug, row);
  // Шаблон для быстрого редактора: если у товара нет своей таблицы, но
  // характеристики перечислены в описании (раздел «Особенности»), подставим их.
  const p = table == null ? bySlug(slug) : undefined;
  const parsed = p ? parseSpecs(p).map(([label, value]) => ({ label, value })) : [];
  return NextResponse.json({
    ok: true,
    slug,
    table,
    facets,
    parsed,
    tableIsCustom: Boolean(row && parseSpecTable(row.table)),
    facetsIsCustom: Boolean(row && parseSpecFacets(row.facets)),
    hasBase: table != null || facets != null,
  });
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const { slug, table, facets } = parsed.data;
    const data: { table: string | null; facets: string | null } = {
      table: table ? JSON.stringify(table) : null,
      facets: facets ? JSON.stringify(facets) : null,
    };
    if (data.table == null && data.facets == null) {
      await db.specOverride.deleteMany({ where: { slug } });
    } else {
      await db.specOverride.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    }
    const count = await regenerateSpecsJson();
    await logAdminAction("Характеристики сохранены", slug);
    return NextResponse.json({ ok: true, overridden: count });
  } catch (e) {
    console.error("Admin specs PUT error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }
  await db.specOverride.deleteMany({ where: { slug } });
  const count = await regenerateSpecsJson();
  await logAdminAction("Характеристики сброшены к эталону", slug);
  return NextResponse.json({ ok: true, overridden: count });
}
