#!/usr/bin/env bash
#
# Запуск/остановка сайта TBS Inform БЕЗ прав root (панельные и shared-хостинги).
#
# Команды:
#   bash start.sh start     — запустить сайт (по умолчанию)
#   bash start.sh stop      — остановить
#   bash start.sh restart   — перезапустить
#   bash start.sh status    — показать состояние
#   bash start.sh logs      — смотреть лог в реальном времени
#
set -u
cd "$(dirname "$0")"

PID_FILE="server.pid"
LOG_FILE="server.log"
SERVER_JS=".next/standalone/server.js"

# Переменные из .env (DATABASE_URL, ADMIN_PASSWORD, PORT)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env 2>/dev/null || true
  set +a
fi
PORT="${PORT:-3000}"

# Чем запускать: bun, если его нет — обычный node
if command -v bun >/dev/null 2>&1; then
  RUN_BIN="bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  export PATH="$HOME/.bun/bin:$PATH"
  RUN_BIN="bun"
else
  RUN_BIN="$(command -v node 2>/dev/null || true)"
fi

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start() {
  if is_running; then
    echo "-- Сайт уже запущен (PID $(cat "$PID_FILE")). Команды: bash start.sh status|logs"
    return 0
  fi
  if [ ! -f "$SERVER_JS" ]; then
    echo "!! Не найден $SERVER_JS — сначала выполните сборку: bash deploy.sh (или bun run build)"
    return 1
  fi
  if [ -z "$RUN_BIN" ]; then
    echo "!! Не найден ни bun, ни node. Установите: curl -fsSL https://bun.sh/install | bash"
    return 1
  fi
  echo "-- Запуск: $RUN_BIN $SERVER_JS (порт $PORT)…"
  nohup env NODE_ENV=production PORT="$PORT" "$RUN_BIN" "$SERVER_JS" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 2
  if is_running; then
    echo "-- Сайт запущен (PID $(cat "$PID_FILE"))."
    echo "   Проверка:   curl http://127.0.0.1:$PORT"
    echo "   Лог:        tail -f $LOG_FILE"
    echo "   Остановка:  bash start.sh stop"
  else
    echo "!! Процесс упал сразу после старта. Последние строки лога:"
    tail -n 20 "$LOG_FILE" 2>/dev/null
    rm -f "$PID_FILE"
    return 1
  fi
}

stop() {
  if is_running; then
    kill "$(cat "$PID_FILE")" 2>/dev/null
    sleep 1
    if is_running; then kill -9 "$(cat "$PID_FILE")" 2>/dev/null; fi
    rm -f "$PID_FILE"
    echo "-- Сайт остановлен."
  else
    rm -f "$PID_FILE"
    echo "-- Сайт не был запущен."
  fi
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; sleep 1; start ;;
  status)
    if is_running; then
      echo "Сайт работает (PID $(cat "$PID_FILE"), порт $PORT)."
    else
      echo "Сайт остановлен. Запуск: bash start.sh"
    fi
    ;;
  logs) tail -n 50 -f "$LOG_FILE" 2>/dev/null ;;
  *) echo "Использование: bash start.sh {start|stop|restart|status|logs}" ;;
esac
