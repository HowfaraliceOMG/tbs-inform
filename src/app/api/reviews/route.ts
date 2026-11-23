import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendTelegram } from "@/lib/shop/admin-settings";

const reviewSchema = z.object({
  productSlug: z.string().trim().min(1).max(200),
  name: z.string().trim().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(5).max(2000),
});

// GET /api/reviews?slug=kenwood-nx-5300e — список отзывов товара
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const reviews = await db.review.findMany({
      where: { productSlug: slug, hidden: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    return NextResponse.json({ ok: true, reviews, count, avg });
  } catch (e) {
    console.error("Review GET error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const review = await db.review.create({ data: parsed.data });
    // Мгновенное уведомление в Telegram (если настроено в админке, «Настройки»):
    // отзыв попадает на модерацию, администратор сразу видит его содержание.
    void sendTelegram(
      [
        "<b>📝 Новый отзыв на сайте</b>",
        `<b>Товар:</b> ${parsed.data.productSlug}`,
        `<b>Автор:</b> ${parsed.data.name} · ${parsed.data.rating}/5`,
        parsed.data.text.slice(0, 500),
      ].join("\n"),
    );
    return NextResponse.json({ ok: true, review });
  } catch (e) {
    console.error("Review POST error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
