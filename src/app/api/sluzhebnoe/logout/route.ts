import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/shop/admin-auth";

export const dynamic = "force-dynamic";

// POST /api/sluzhebnoe/logout — выход: сброс cookie
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: ADMIN_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
