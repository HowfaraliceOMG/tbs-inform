import { BRANDS, PRODUCTS } from "@/lib/shop/data";

// Карта сайта /sitemap.xml — ручной XML вместо MetadataRoute.Sitemap:
// у товаров нужны теги <image:image> (фото раций в Google/Yandex Images),
// а тип Next.js расширенные пространства имён не поддерживает.
// hreflang — через xhtml:link: чистый адрес (x-default/ru) + ?lang=uz|en.
const BASE = "https://tbs.uz";

const CATEGORY_SLUGS = [
  "lyubitelskie",
  "mobilnye",
  "analogovye",
  "poc",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface SitemapImage {
  loc: string;
  title: string;
  caption: string;
}

function urlEntry(path: string, images: SitemapImage[] = []) {
  const clean = path === "/" ? "/" : path.replace(/\/+$/, "");
  const lines = [
    "  <url>",
    `    <loc>${BASE}${clean}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${clean}"/>`,
    `    <xhtml:link rel="alternate" hreflang="ru" href="${BASE}${clean}?lang=ru"/>`,
    `    <xhtml:link rel="alternate" hreflang="uz" href="${BASE}${clean}?lang=uz"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${BASE}${clean}?lang=en"/>`,
    ...images.flatMap((im) => [
      "    <image:image>",
      `      <image:loc>${BASE}${encodeURI(im.loc)}</image:loc>`,
      `      <image:title>${esc(im.title)}</image:title>`,
      `      <image:caption>${esc(im.caption)}</image:caption>`,
      "    </image:image>",
    ]),
    "  </url>",
  ];
  return lines.join("\n");
}

export const dynamic = "force-static";

export function GET() {
  const staticPaths = [
    "/",
    "/vse-radiostancii",
    "/radiostancii-1",
    ...CATEGORY_SLUGS.map((c) => `/radiostancii-1/radiostancii-${c}`),
    ...BRANDS.map((b) => `/radiostancii-${b.toLowerCase().replace(/\s+/g, "-")}`),
    "/retranslyatory",
    "/uslugi",
    "/about-us",
    "/poleznoe",
    "/slovar-terminov",
    "/contact",
    "/politika-konfidentsialnosti",
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...staticPaths.map((p) => urlEntry(p)),
    ...PRODUCTS.map((p) =>
      urlEntry(
        `/product/${p.slug}`,
        [p.img, ...p.gallery.filter((g) => g !== p.img)].slice(0, 4).map((g) => ({
          loc: g,
          title: `${p.name} — купить в Ташкенте | TBS Inform`,
          caption: `${p.name} — профессиональная радиостанция, TBS Inform`,
        }))
      )
    ),
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
