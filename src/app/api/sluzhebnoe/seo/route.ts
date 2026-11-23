import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/shop/admin-auth";
import { adminSeoData, saveSeo, resetSeo } from "@/lib/shop/seo-db";
import { logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

/**
 * SEO meta-теги страниц в админ-панели:
 * GET    — все страницы (реестр + товары) с правками и дефолтами;
 * PUT    — сохранить { path, title, description, keywords };
 * DELETE — сбросить путь к дефолту (?path=…).
 */
function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

const putSchema = z.object({
  path: z.string().startsWith("/").min(1).max(300),
  title: z.string().max(200).optional().default(""),
  description: z.string().max(1000).optional().default(""),
  keywords: z.string().max(500).optional().default(""),
});

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const entries = await adminSeoData();
    return NextResponse.json({ ok: true, entries });
  } catch (e) {
    console.error("Admin seo GET error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const { path, title, description, keywords } = parsed.data;
    await saveSeo(path, { title, description, keywords });
    await logAdminAction("SEO сохранено", path);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin seo PUT error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const path = req.nextUrl.searchParams.get("path");
    if (!path || !path.startsWith("/") || path.length > 300) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    await resetSeo(path);
    await logAdminAction("SEO сброшено к умолчанию", path);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin seo DELETE error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
