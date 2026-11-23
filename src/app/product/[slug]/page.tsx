import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { ProductView } from "@/components/shop/ProductView";
import { bySlug } from "@/lib/shop/data";
import { seoAlternates } from "@/lib/shop/seo";
import { getSeoMeta } from "@/lib/shop/seo-pages";

interface Props {
  params: Promise<{ slug: string }>;
}

const SITE_URL = "https://tbs.uz";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = bySlug(slug);
  if (!p) return { title: "TBS Inform" };
  const defDesc = (p.ru[0] || p.short).slice(0, 300);
  // Правка SEO из админ-панели (SeoOverride → src/data/seo.json) поверх дефолта
  const m = getSeoMeta(`/product/${p.slug}`, { title: `${p.name} — TBS Inform`, description: defDesc });
  const title = m.title ?? `${p.name} — TBS Inform`;
  const description = m.description ?? defDesc;
  // Превью в мессенджерах: несколько кадров галереи (первый — главное фото),
  // абсолютные URL подставит metadataBase из layout; цена всегда «по запросу»,
  // поэтому честно пишем это прямо в описание превью
  const ogImages = [p.img, ...p.gallery.filter((g) => g !== p.img)].slice(0, 4).map((g) => encodeURI(g));
  const ogDescription = `${description} · Цена по запросу`;
  return {
    title,
    description,
    ...(m.keywords?.length ? { keywords: m.keywords } : {}),
    alternates: seoAlternates(`/product/${p.slug}`),
    openGraph: {
      title,
      description: ogDescription,
      type: "website",
      siteName: "TBS Inform",
      locale: "ru_RU",
      alternateLocale: ["uz_UZ", "en_US"],
      images: ogImages.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
      images: ogImages,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = bySlug(slug);
  if (!p) notFound();
  const cat = p.cats[0];

  // Реальный средний балл из одобренных отзывов (БД). Без отзывов ключа
  // aggregateRating не будет — поисковикам нельзя показывать выдуманные оценки.
  // Страницы товаров пререндерятся при сборке, поэтому рейтинг фиксируется
  // на момент сборки пакета — для SEO это нормально, отзывы меняются редко.
  let aggregateRating: { ratingValue: string; reviewCount: number; bestRating: string; worstRating: string } | undefined;
  try {
    const agg = await db.review.aggregate({
      where: { productSlug: slug, hidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });
    if (agg._count._all > 0 && agg._avg.rating != null) {
      aggregateRating = {
        ratingValue: String(Math.round(agg._avg.rating * 10) / 10),
        reviewCount: agg._count._all,
        bestRating: "5",
        worstRating: "1",
      };
    }
  } catch {
    /* БД недоступна — разметка просто без рейтинга */
  }

  // JSON-LD Product для поисковиков. Цен у товаров нет (модель «по запросу»),
  // поэтому Offer без price — выдумывать цифры нельзя.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: (p.ru[0] || p.short).slice(0, 500),
    image: p.gallery.slice(0, 4).map((g) => `${SITE_URL}${encodeURI(g)}`),
    sku: p.slug,
    brand: { "@type": "Brand", name: p.brand },
    url: `${SITE_URL}/product/${p.slug}`,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${p.slug}`,
      availability: "https://schema.org/InStock",
      priceCurrency: "UZS",
    },
    ...(aggregateRating ? { aggregateRating } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      {/* BreadcrumbList для поисковиков генерирует сам <Breadcrumbs> — единая
          разметка на всех страницах сайта (раньше здесь был дубль скрипта) */}
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Все радиостанции", href: "/vse-radiostancii" },
          ...(cat ? [{ label: cat }] : []),
          { label: p.name },
        ]}
      />
      <ProductView p={p} />
    </>
  );
}
