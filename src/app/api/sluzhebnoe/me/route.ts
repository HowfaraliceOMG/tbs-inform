import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/shop/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/sluzhebnoe/me — авторизован ли текущий браузер (по cookie)
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, authed: isAdmin(req) });
}
