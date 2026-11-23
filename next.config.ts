import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Загруженные через админку файлы (public/uploads) отдаёт API-роут /api/media:
  // сервер кэширует содержимое public при старте, и runtime-файлы через статику
  // видны только после перезапуска. Rewrite делает их доступными сразу по
  // человеческому пути /uploads/<имя> (в т.ч. для next/image).
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: "/api/media/:path*" }];
  },
  // Категория «Радиостанции LTE» удалена из каталога: старый адрес ведёт
  // на родительскую категорию (301), чтобы не терять тех, кто пришёл
  // из поисковой выдачи или по сохранённой закладке.
  async redirects() {
    return [
      {
        source: "/radiostancii-1/radiostancii-lte",
        destination: "/radiostancii-1",
        permanent: true,
      },
    ];
  },
  /* config options here */
  // Prisma подставляет нативный движок по строке запроса (динамический
  // require), поэтому трассировка его не видит — включаем принудительно.
  // Движки всех платформ лежат в node_modules/.prisma/client (см.
  // binaryTargets в prisma/schema.prisma) — это даёт совместимость с любым
  // Linux-хостингом без пересборки на нём.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/libquery_engine-*.node"],
  },
  images: {
    // Обрезаны крупные кандидаты 2048/3840: их никто не выбирает (максимум
    // на реальных устройствах — 1920), а каждый лишний вариант — лишняя
    // работа оптимизатора и раздутый srcset в HTML
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Кеш оптимизированных картинок на клиенте: дефолт Next 16 — 4 часа
    // (must-revalidate), из-за чего телефоны перекачивали одни и те же баннеры
    // каждые 4 часа. 30 дней: трафик падает в разы; за месяц картинки в
    // /tbs-img и /uploads успевают обновиться (файлы с новыми именами не
    // затрагиваются, перезапись существующего имени — редкий кейс)
    minimumCacheTTL: 2592000,
    // Превью видеообзоров, добавленных в админ-панели (ProductOverride.video)
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  // Проверка типов при сборке включена (поведение по умолчанию): после чистки
  // 80 TS-ошибок компилятор снова ловит опечатки в типах до выезда в продакшен.
  // StrictMode включён: в dev двойным вызовом эффектов ловит побочные эффекты
  // (на прод не влияет). PageTracker защищён от двойной отправки ref-стражем.
  reactStrictMode: true,
};

export default nextConfig;
