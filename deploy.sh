#!/usr/bin/env bash
#
# Установка/обновление сайта TBS Inform на VPS (Ubuntu/Debian).
# Запуск из корня распакованного проекта:
#     bash deploy.sh
# Скрипт идемпотентен: его можно запускать повторно для обновления сайта.
#
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="tbs-inform"
PORT="${PORT:-3000}"
RUN_USER="$(id -un)"

echo "=== TBS Inform: установка в $APP_DIR ==="

# ─── 1. Bun (сборка и запуск) ────────────────────────────────────────────────
if ! command -v bun >/dev/null 2>&1; then
  echo "-- Bun не найден, устанавливаю…"
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
BUN_BIN="$(command -v bun)"
echo "-- Bun: $($BUN_BIN --version)"

# ─── 2. Зависимости и Prisma Client ──────────────────────────────────────────
echo "-- Установка зависимостей (bun install)…"
"$BUN_BIN" install

echo "-- Генерация Prisma Client…"
"$BUN_BIN" x prisma generate

# ─── 3. .env ─────────────────────────────────────────────────────────────────
# DATABASE_URL должен содержать абсолютный путь БД на ЭТОМ сервере.
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL=file:$APP_DIR/db/custom.db
# Пароль администратора (/admin). СМЕНИТЕ его перед запуском!
ADMIN_PASSWORD=tbs2026
EOF
  echo "!! Создан файл .env — ОБЯЗАТЕЛЬНО смените ADMIN_PASSWORD (команда ниже)"
else
  if grep -q "^DATABASE_URL=" .env; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=file:$APP_DIR/db/custom.db|" .env
  else
    echo "DATABASE_URL=file:$APP_DIR/db/custom.db" >> .env
  fi
  if ! grep -q "^ADMIN_PASSWORD=" .env; then
    echo "ADMIN_PASSWORD=tbs2026" >> .env
    echo "!! В .env добавлен ADMIN_PASSWORD — СМЕНИТЕ его!"
  fi
fi

# ─── 4. Сборка ───────────────────────────────────────────────────────────────
echo "-- Сборка сайта (next build, ~2-5 минут)…"
NODE_ENV=production "$BUN_BIN" run build

# ─── 5. systemd-сервис (автозапуск и перезапуск при сбоях) ───────────────────
if command -v systemctl >/dev/null 2>&1 && [ "${SKIP_SERVICE:-0}" != "1" ]; then
  SUDO=""
  if [ "$(id -u)" != "0" ]; then
    # Права на /etc/systemd есть только у root (или sudo без пароля).
    # На панельных хостингах его нет — тогда просто подсказываем start.sh.
    if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
      SUDO="sudo"
    else
      echo ""
      echo "!! Нет прав на systemd (это панельный/общий хостинг — так и должно быть)."
      echo "   Сайт уже установлен и собран. Запустите его командой:"
      echo "       bash start.sh"
      echo "   А если в панели хостинга есть раздел «Node.js-приложения», лучше"
      echo "   запустить через панель: файл запуска — server.js (README-USTANOVKA.md, п. 2а)."
      exit 0
    fi
  fi
  echo "-- Создание systemd-сервиса $SERVICE_NAME…"

  $SUDO tee "/etc/systemd/system/$SERVICE_NAME.service" >/dev/null <<EOF
[Unit]
Description=TBS Inform — сайт (Next.js standalone)
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
EnvironmentFile=$APP_DIR/.env
ExecStart=$BUN_BIN .next/standalone/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable "$SERVICE_NAME" >/dev/null
  $SUDO systemctl restart "$SERVICE_NAME"
  sleep 2
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "-- Сервис запущен: systemctl status $SERVICE_NAME"
    echo "-- Проверка: curl http://127.0.0.1:$PORT"
  else
    echo "!! Сервис не поднялся. Логи: journalctl -u $SERVICE_NAME -n 50"
  fi
else
  echo "-- SKIP_SERVICE=1 или systemd недоступен: запуск вручную —"
  echo "   NODE_ENV=production PORT=$PORT $BUN_BIN .next/standalone/server.js"
  echo "   или проще:  bash start.sh"
fi

echo
echo "=== Готово. Далее (см. README-USTANOVKA.md): ==="
echo "  1) Смените пароль админки: файл $APP_DIR/.env → ADMIN_PASSWORD, затем"
echo "     sudo systemctl restart $SERVICE_NAME"
echo "  2) Настройте nginx (прокси на 127.0.0.1:$PORT + /uploads/) и SSL (certbot)"
echo "  3) Направьте домен (A-запись) на IP сервера"
