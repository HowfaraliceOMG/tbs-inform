# TBS Inform — сайт (Next.js 16)

Корпоративный сайт-каталог раций TBS Inform (3 языка: ru / uz / en), админ-панель, заявки, отзывы, статистика посещаемости.

## Быстрый старт (VPS, Ubuntu/Debian)

```bash
bash deploy.sh
```

Скрипт сам ставит Bun, зависимости, Prisma Client, создаёт `.env`, собирает сайт и регистрирует systemd-сервис. Подробности: **README-USTANOVKA.md** (установка) и **README-PLESK.md** (панельные хостинги: cPanel, Plesk, ISPManager).

## Стек

- Next.js 16 (output: standalone), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui, framer-motion
- Prisma + SQLite (`db/custom.db`), запуск через Bun или Node 20+

## Структура данных

- `src/data/products.base.json` — эталонный каталог (1551 строка, ~260 КБ)
- `src/data/products.json` — итоговый каталог (эталон + правки из админки; перегенерируется prebuild-скриптом `scripts/apply-overrides.ts`)
- `src/data/specs.json`, `src/data/seo.json`, `src/data/site.json` — переопределения характеристик/SEO/контента
- `db/backups/` — JSON-бэкапы БД
- Админка: `/admin` (пароль в `.env` → `ADMIN_PASSWORD`)

## ⚠️ Файлы, залитые отдельным ZIP

Из-за лимитов текстового API в репозиторий **не попали** бинарники и три больших файла:

- `public/tbs-img/**` — фото товаров, баннеры, логотипы (~20 МБ)
- `src/data/products.base.json`, `src/data/products.json`
- `bun.lock`

После распаковки ZIP просто перетащите эти файлы/папки на страницу репозитория (**Add file → Upload files**) — GitHub сохранит структуру папок. Без них сайт соберётся, но фото и данные товаров будут отсутствовать.

## Переменные окружения (`.env`)

```env
DATABASE_URL=file:/var/www/tbs/db/custom.db
ADMIN_PASSWORD=смените-меня
```

Пример: `.env.example`. `deploy.sh` создаёт `.env` автоматически.

## Команды

| Команда | Назначение |
| --- | --- |
| `bun install` | зависимости |
| `bun run db:generate` | генерация Prisma Client |
| `bun run build` | сборка (standalone) |
| `bash start.sh start\|stop\|restart\|logs` | запуск/остановка без root |
