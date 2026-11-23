import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendTelegram } from "@/lib/shop/admin-settings";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(30)
    .regex(/^[+0-9\s\-()]+$/, "Invalid phone"),
  message: z.string().trim().max(2000).optional().nullable(),
  product: z.string().trim().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const lead = await db.lead.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message || null,
        product: parsed.data.product || null,
      },
    });

    // Мгновенное уведомление в Telegram (если настроено в админке, «Настройки»).
    // Ошибка отправки не влияет на заявку — она уже сохранена в базе.
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const lines = [
      "<b>Новая заявка — TBS Inform</b>",
      `Имя: ${esc(parsed.data.name)}`,
      `Телефон: ${esc(parsed.data.phone)}`,
    ];
    if (parsed.data.product) lines.push(`Товар: ${esc(parsed.data.product)}`);
    if (parsed.data.message) lines.push(`Сообщение: ${esc(parsed.data.message)}`);
    void sendTelegram(lines.join("\n"));

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (e) {
    console.error("Lead POST error:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER" },
      { status: 500 }
    );
  }
}
