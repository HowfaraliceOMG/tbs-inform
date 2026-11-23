import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/shop/admin-auth";
import { TRANSLATE_LANGS, translateParagraphs } from "@/lib/shop/translate";

export const dynamic = "force-dynamic";

/**
 * Автоперевод описаний товаров для админ-панели: кнопки «RU → UZ», «RU → EN»
 * в редакторе товара. Логика перевода — в src/lib/shop/translate.ts.
 */

const schema = z.object({
  text: z.string().min(1).max(20000),
  from: z.enum(TRANSLATE_LANGS).default("ru"),
  to: z.enum(TRANSLATE_LANGS),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  let parsed: z.infer<typeof schema>;
  try {
    const body = await req.json();
    const check = schema.safeParse(body);
    if (!check.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    parsed = check.data;
  } catch {
    return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
  }

  const { text, from, to } = parsed;
  if (from === to) {
    return NextResponse.json({ ok: true, text });
  }

  try {
    const out = await translateParagraphs(text, from, to);
    if (!out.trim()) throw new Error("empty result");
    return NextResponse.json({ ok: true, text: out });
  } catch (e) {
    console.error("Admin translate error:", e);
    return NextResponse.json(
      { ok: false, error: "PROVIDER", hint: "Сервис перевода недоступен, попробуйте позже" },
      { status: 502 },
    );
  }
}
