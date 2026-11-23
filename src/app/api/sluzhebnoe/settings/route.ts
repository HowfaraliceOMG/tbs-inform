import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import {
  getTelegram,
  hasDbPassword,
  sendTelegram,
  setTelegram,
  setPassword,
  verifyPassword,
  logAdminAction,
} from "@/lib/shop/admin-settings";

export const dynamic = "force-dynamic";

/**
 * Настройки панели (вкладка «Настройки»):
 *  • GET  — состояние (задан ли пароль в панели, настройки Telegram)
 *  • PUT  — action=password (смена пароля), action=telegram (сохранить настройки)
 *  • POST — action=clear_stats (очистка статистики), action=test_telegram
 */

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const [pwdSet, tg] = await Promise.all([hasDbPassword(), getTelegram()]);
  return NextResponse.json({
    ok: true,
    passwordSet: pwdSet,
    telegram: { enabled: tg.enabled, token: tg.token ? "••••" + tg.token.slice(-4) : "", chat: tg.chat },
  });
}

const putSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("password"), current: z.string().min(1).max(200), next: z.string().min(6).max(200) }),
  z.object({
    action: z.literal("telegram"),
    enabled: z.boolean(),
    token: z.string().max(200),
    chat: z.string().max(60),
  }),
]);

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }

    if (parsed.data.action === "password") {
      if (!(await verifyPassword(parsed.data.current))) {
        return NextResponse.json({ ok: false, error: "WRONG_PASSWORD" }, { status: 400 });
      }
      await setPassword(parsed.data.next);
      await logAdminAction("Настройки: пароль изменён");
      return NextResponse.json({ ok: true, message: "Пароль изменён" });
    }

    const tg = await getTelegram();
    // Пустой token = оставить сохранённый (в UI показывается маской)
    const token = parsed.data.token.trim() || tg.token;
    await setTelegram({ enabled: parsed.data.enabled, token, chat: parsed.data.chat.trim() });
    await logAdminAction("Настройки: Telegram уведомления обновлены");
    return NextResponse.json({
      ok: true,
      telegram: { enabled: parsed.data.enabled, token: token ? "••••" + token.slice(-4) : "", chat: parsed.data.chat.trim() },
    });
  } catch (e) {
    console.error("Admin settings PUT error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("clear_stats"), olderDays: z.number().int().min(0).max(3650) }),
  z.object({ action: z.literal("test_telegram") }),
]);

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }

    if (parsed.data.action === "clear_stats") {
      // olderDays=0 — удалить всю статистику, иначе старше N дней
      const where =
        parsed.data.olderDays > 0 ? { createdAt: { lt: new Date(Date.now() - parsed.data.olderDays * 86_400_000) } } : {};
      const [views, searches] = await Promise.all([
        db.pageView.deleteMany({ where }),
        db.searchLog.deleteMany({ where }),
      ]);
      await logAdminAction("Настройки: статистика очищена", `${views.count} просмотров, ${searches.count} запросов`);
      return NextResponse.json({ ok: true, deletedViews: views.count, deletedSearches: searches.count });
    }

    const sent = await sendTelegram("<b>TBS Inform</b> — тестовое уведомление: всё подключено, заявки будут приходить сюда.");
    if (!sent) {
      return NextResponse.json(
        { ok: false, error: "TELEGRAM", hint: "Проверьте токен бота, chat id и что включены уведомления" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin settings POST error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
