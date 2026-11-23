import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/media/<имя> — отдача файлов, загруженных через админку.
 *
 * Вызывается через rewrite /uploads/* (next.config.ts): сервер кэширует
 * содержимое public при старте, и runtime-файлы через статику видны только
 * после перезапуска. Здесь файл читается с диска на каждый запрос —
 * загруженный баннер доступен сразу, без рестарта.
 *
 * Файлы лежат в public/uploads/ (та же папка, куда пишет /api/sluzhebnoe/upload
 * и которую README-PLESK велит сохранять при обновлениях). Путь валидируется:
 * ровно один сегмент [a-z0-9][a-z0-9._-]* с расширением картинки — ни
 * traversal, ни чужих файлов.
 */

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function notFound() {
  return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.length !== 1) return notFound();
  const name = path[0];
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name) || name.includes("..")) return notFound();
  const ext = name.slice(name.lastIndexOf(".") + 1);
  const mime = MIME[ext];
  if (!mime) return notFound();
  try {
    const buf = await readFile(join(UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        // имена уникальны (дедупликация -2, -3…) — кэшируем навсегда;
        // CSP не влияет на отрисовку <img>, но блокирует скрипты при прямом
        // открытии svg в новой вкладке
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return notFound();
  }
}
