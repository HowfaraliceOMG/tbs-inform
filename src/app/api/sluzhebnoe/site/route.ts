import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/shop/admin-auth";
import {
  adminSiteData,
  saveSiteSection,
  resetSiteSection,
  SITE_KEYS,
  type SiteKey,
} from "@/lib/shop/site-content";
import { logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

/**
 * Секции сайта в админ-панели: шаблон (слайдер, контакты, логотипы клиентов,
 * новинки) и другие разделы (о компании, услуги, статьи, FAQ, словарь).
 * GET — эффективные значения; PUT — сохранить секцию; DELETE — сброс секции.
 */

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const sections = await adminSiteData();
    return NextResponse.json({ ok: true, sections });
  } catch (e) {
    console.error("Admin site GET error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

// Рекурсивная санитизация присылаемого JSON: глубина ≤ 6, элементы ≤ 200,
// строки ≤ 8000 символов — защита от мусора и раздутых payloads.
function sanitize(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.slice(0, 8000);
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) {
    if (depth > 5) return null;
    return value.slice(0, 200).map((v) => sanitize(v, depth + 1));
  }
  if (value && typeof value === "object") {
    if (depth > 5) return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).slice(0, 80)) {
      out[k.slice(0, 60)] = sanitize(v, depth + 1);
    }
    return out;
  }
  return null;
}

const putSchema = z.object({
  key: z.enum(SITE_KEYS),
  data: z.unknown(),
});

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const clean = sanitize(parsed.data.data);
    const json = JSON.stringify(clean);
    if (json.length > 400_000) {
      return NextResponse.json({ ok: false, error: "TOO_LARGE" }, { status: 400 });
    }
    await saveSiteSection(parsed.data.key as SiteKey, clean);
    await logAdminAction("Контент сохранён", parsed.data.key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin site PUT error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const key = req.nextUrl.searchParams.get("key");
    if (!key || !(SITE_KEYS as readonly string[]).includes(key)) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    await resetSiteSection(key as SiteKey);
    await logAdminAction("Контент сброшен", key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin site DELETE error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
