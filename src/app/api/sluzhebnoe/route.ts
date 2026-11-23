import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { adminProductList } from "@/lib/shop/products-override";
import { getAdminLog } from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

// Панель управления TBS Inform. Доступ — по подписанной cookie (см. admin-auth).
// Данные: заявки, отзывы (с модерацией), товары (с правками), посещаемость.

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

// GET — все данные панели: заявки, отзывы, список товаров с правками
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const [leads, reviews, products, log] = await Promise.all([
      db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      db.review.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      adminProductList(),
      getAdminLog(),
    ]);
    return NextResponse.json({ ok: true, leads, reviews, products, log: log.slice(0, 30) });
  } catch (e) {
    console.error("Admin GET error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

const patchSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("lead"), id: z.string().min(1), done: z.boolean() }),
  z.object({ type: z.literal("review"), id: z.string().min(1), hidden: z.boolean() }),
]);

// PATCH — отметить заявку обработанной / скрыть-показать отзыв
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const { type, id } = parsed.data;
    if (type === "lead") {
      await db.lead.update({ where: { id }, data: { done: parsed.data.done } });
    } else {
      await db.review.update({ where: { id }, data: { hidden: parsed.data.hidden } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin PATCH error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  type: z.enum(["lead", "review"]),
  id: z.string().min(1),
});

// DELETE — удалить заявку или отзыв
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const { type, id } = parsed.data;
    if (type === "lead") await db.lead.delete({ where: { id } });
    if (type === "review") await db.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin DELETE error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
