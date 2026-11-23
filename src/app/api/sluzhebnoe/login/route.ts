import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  clientIp,
  makeToken,
  rateLimit,
} from "@/lib/shop/admin-auth";
import { verifyPassword, logAdminAction } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(1).max(200) });

// POST /api/sluzhebnoe/login — вход в панель: пароль → подписанная httpOnly cookie.
// Пароль берётся из БД (если менялся в панели) либо из ADMIN_PASSWORD.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    if (!rateLimit(clientIp(req))) {
      return NextResponse.json({ ok: false, error: "TOO_MANY" }, { status: 429 });
    }
    if (!(await verifyPassword(parsed.data.password))) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    await logAdminAction("Вход в панель управления");
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: ADMIN_COOKIE,
      value: makeToken(),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error("Admin login error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
