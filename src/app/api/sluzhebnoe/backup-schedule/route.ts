import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isAdmin } from "@/lib/shop/admin-auth";
import { getSetting, logAdminAction } from "@/lib/shop/admin-settings";
import {
  backupDir,
  getAutoBackupConfig,
  isValidBackupName,
  listAutoBackups,
  runAutoBackup,
  setAutoBackupConfig,
} from "@/lib/shop/backup-scheduler";

export const dynamic = "force-dynamic";

/**
 * Автобэкап по расписанию (вкладка «Настройки»):
 *  • GET                — состояние: настройки, последняя копия, список файлов;
 *  • GET ?download=name — скачать файл автокопии с сервера;
 *  • PUT                — сохранить настройки расписания;
 *  • POST               — action=run_now: сделать копию прямо сейчас.
 */

function unauthorized() {
  return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const download = req.nextUrl.searchParams.get("download");
  if (download) {
    if (!isValidBackupName(download)) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    try {
      const content = readFileSync(join(backupDir(), download), "utf8");
      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${download}"`,
        },
      });
    } catch {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }
  }
  const cfg = await getAutoBackupConfig();
  const last = await getSetting<number | null>("auto_backup_last");
  const files = listAutoBackups();
  const lastTs = last ?? files[0]?.createdAt ?? null;
  const nextRun =
    cfg.enabled && lastTs
      ? new Date(new Date(lastTs).getTime() + cfg.intervalHours * 3_600_000).toISOString()
      : null;
  return NextResponse.json({
    ok: true,
    config: cfg,
    lastRun: lastTs,
    nextRun,
    files: files.slice(0, 50),
  });
}

const putSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().min(1).max(8760),
  keep: z.number().int().min(1).max(60),
});

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const cfg = parsed.data;
    await setAutoBackupConfig(cfg);
    await logAdminAction(
      "Настройки: автобэкап",
      `${cfg.enabled ? "включён" : "выключен"}, каждые ${cfg.intervalHours} ч, хранить ${cfg.keep}`,
    );
    return NextResponse.json({ ok: true, config: cfg });
  } catch (e) {
    console.error("Admin backup-schedule PUT error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const body = z.object({ action: z.literal("run_now") }).safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
    }
    const res = await runAutoBackup(true);
    if (!res.ran) {
      return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, file: res.file, files: listAutoBackups().slice(0, 50) });
  } catch (e) {
    console.error("Admin backup-schedule POST error:", e);
    return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
  }
}
