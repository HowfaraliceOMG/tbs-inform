/**
 * Точка входа для панельных хостингов (cPanel «Setup Node.js App»,
 * ISPManager, Plesk и т.п.), где приложение запускает сама панель,
 * а не systemd.
 *
 * В панели хостинга укажите:
 *   - Application startup file (файл запуска): server.js
 *   - Node.js: версия 20 или новее
 *   - режим: Production
 *
 * Перед запуском в папке сайта должна быть выполнена сборка:
 *   bash deploy.sh   (или: bun install && bun x prisma generate && bun run build)
 *
 * Параметры берутся из файла .env (DATABASE_URL, ADMIN_PASSWORD, PORT).
 * Этот файл НЕ нужен на VPS — там запуск идёт через systemd (deploy.sh).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// Файл специально написан на CommonJS: панель хостинга запускает его
// напрямую через `node server.js`, без сборки и без ESM-обвязки.

const path = require("path");
const fs = require("fs");

// ── Мини-загрузчик .env (чтобы не зависеть от настроек панели) ──────────────
try {
  const raw = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch (_) {
  /* файла .env нет — не страшно */
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";

(async () => {
  const next = (await import("next")).default;
  const http = require("http");

  const port = parseInt(process.env.PORT || "3000", 10);
  const app = next({ dev: false, dir: __dirname });
  const handle = app.getRequestHandler();

  await app.prepare();

  http
    .createServer((req, res) => handle(req, res))
    .listen(port, () => {
      console.log(`TBS Inform запущен: http://127.0.0.1:${port}`);
    });
})().catch((err) => {
  console.error("Не удалось запустить сайт:", err);
  process.exit(1);
});
