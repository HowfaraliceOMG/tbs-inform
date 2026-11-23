import type { MetadataRoute } from "next";

/**
 * robots.txt генерируется фреймворком (маршрут /robots.txt).
 * /api закрыт от роботов. Путь панели управления в robots.txt НЕ публикуется:
 * адрес панели не разглашается (Disallow сам бы подсказал сканерам, где искать).
 * Панель закрыта от индексации через noindex в метаданных самой страницы.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://tbs.uz/sitemap.xml",
    host: "https://tbs.uz",
  };
}
