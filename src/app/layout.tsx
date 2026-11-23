import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ShopLangProvider } from "@/components/shop/ShopLangProvider";
import { TopBar } from "@/components/shop/TopBar";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { MobileTabBar } from "@/components/shop/MobileTabBar";
import { MessengerFan } from "@/components/shop/MessengerFan";
import { CompareBar } from "@/components/shop/CompareBar";
import { CookieBar, ShopFooter } from "@/components/shop/ShopFooter";
import { PageTracker } from "@/components/shop/PageTracker";
import { PWARegister } from "@/components/shop/PWARegister";

// Единый шрифт сайта — геометричный Manrope (поддержка RU/UZ/EN)
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = "https://tbs.uz";
const OG_IMAGE = "/tbs-img/catalog__Main-banner-20.jpg";
const SITE_TITLE = "Купить Рации в Ташкенте — Сервисное Обслуживание | TBS Inform";
const SITE_DESC =
  "Купить Рации и Радиостанции в Ташкенте? Мы предлагаем высококачественные оборудование для связи в Узбекистане. Заказывайте у нас и наслаждайтесь.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  // Иконка из баннера шапки (scripts/make_favicon.py). Явный список: при
  // заданном icons Next.js не дублирует файловые конвенции автоматически.
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "TBS Inform",
    locale: "ru_UZ",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [{ url: OG_IMAGE, width: 1903, height: 720, alt: "TBS Inform — профессиональная радиосвязь" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [OG_IMAGE],
  },
};

// JSON-LD: организация + точка продаж (адрес, телефоны, часы работы, гео)
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#organization`,
  name: "TBS Inform",
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/tbs-img/catalog__logo.png`,
  telephone: "+998712370086",
  email: "info@tbs.uz",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "площадь Хамида Алимжана, 13Б",
    addressLocality: "Ташкент",
    addressCountry: "UZ",
  },
  geo: { "@type": "GeoCoordinates", latitude: 41.311171, longitude: 69.279762 },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
};

// JSON-LD WebSite: привязка сайта к организации (поиск не URL-based —
// клиентская панель, поэтому SearchAction не добавляем)
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "TBS Inform",
  url: `${SITE_URL}/`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: ["ru", "uz", "en"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SSR выбранного языка: cookie tbs-lang ставит middleware (адреса /?lang=xx
  // из hreflang) и переключатель языка (ShopLangProvider.setLang), поэтому
  // серверный HTML отдаётся сразу в выбранной локали — её видит и поисковик.
  // Чтение cookie делает все маршруты динамическими (для сайта из ~50 страниц
  // на локальном SQLite это несущественно).
  const lang = (await cookies()).get("tbs-lang")?.value;
  const initialLang = lang === "uz" || lang === "en" || lang === "ru" ? lang : "ru";
  return (
    <html lang={initialLang} suppressHydrationWarning className={manrope.variable}>
      <body className="font-sans antialiased bg-white text-foreground dark:bg-[#0B1220] dark:text-slate-200">
        {/* Пока пользователь прокручивает страницу — замирают все декоративные анимации
            (бегущие строки, пульсации, свечение): кадры прокрутки не делят ресурсы
            с анимациями, и листание остаётся плавным даже на слабых телефонах.
            Класс снимается через 180 мс после последнего события прокрутки. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var t;window.addEventListener('scroll',function(){document.documentElement.classList.add('is-scrolling');clearTimeout(t);t=setTimeout(function(){document.documentElement.classList.remove('is-scrolling')},180)},{passive:true})})();",
          }}
        />
        {/* RUM: фактическая скорость у реальных посетителей (Core Web Vitals).
            Работает без гидрации: PerformanceObserver снимает TTFB/FCP/LCP/INP/CLS,
            один beacon уходит при уходе со страницы (или сворачивании вкладки).
            Агрегаты (p75) — в админке, «Обзор» → «Фактическая скорость». */}
        <script
          dangerouslySetInnerHTML={{
            __html: String.raw`(function(){
  if (location.pathname.indexOf("/sluzhebnoe") === 0) return;
  var s = { ttfb: null, fcp: null, lcp: null, inp: 0, cls: 0 };
  try {
    var nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.responseStart > 0) s.ttfb = Math.round(nav.responseStart);
    new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) s.fcp = Math.round(e[e.length - 1].startTime); })
      .observe({ type: "paint", buffered: true });
    new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) s.lcp = Math.round(e[e.length - 1].startTime); })
      .observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(function (l) { var e = l.getEntries(); for (var i = 0; i < e.length; i++) if (!e[i].hadRecentInput) s.cls += e[i].value; })
      .observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(function (l) { var e = l.getEntries(); for (var i = 0; i < e.length; i++) if (e[i].interactionId && e[i].duration > s.inp) s.inp = Math.round(e[i].duration); })
      .observe({ type: "event", buffered: true, durationThreshold: 40 });
  } catch (err) { /* старые браузеры: шлём что успели собрать */ }
  var sent = false;
  var send = function () {
    if (sent) return;
    sent = true;
    try {
      var anon = localStorage.getItem("tbs-anon");
      if (!anon) {
        anon = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("tbs-anon", anon);
      }
      var m = document.cookie.match(/(?:^|;\s*)tbs-lang=(ru|uz|en)/);
      var w = window.innerWidth;
      var body = JSON.stringify({
        path: location.pathname,
        lang: m ? m[1] : null,
        anon: anon,
        device: w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop",
        ttfb: s.ttfb, fcp: s.fcp, lcp: s.lcp,
        inp: s.inp > 0 ? s.inp : null,
        cls: Math.round(s.cls * 1000) / 1000,
      });
      var blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/vitals", blob);
      else fetch("/api/vitals", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch (err) {}
  };
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
  window.addEventListener("pagehide", send);
})();`,
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        {/* Тема «Полуночное небо»: класс .dark на <html>, переключение — ThemeToggle в шапке */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <ShopLangProvider initialLang={initialLang}>
      <PageTracker />
          <div className="print:hidden">
            <TopBar />
          </div>
          {/* Шапка — прямой ребёнок body: position:sticky работает только внутри
              родительского бокса, поэтому общая обёртка с TopBar ломала липкость
              (шапка уезжала вместе со страницей) */}
          <ShopHeader />
          {children}
          <div className="print:hidden">
            <ShopFooter />
          </div>
          {/* Спейсер под нижнюю таб-панель мобильной версии (h-16 + safe-area):
              подвал не уезжает за fixed-панель */}
          <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden print:hidden" />
          <CookieBar />
          <div className="print:hidden">
            <MessengerFan />
            <CompareBar />
            <MobileTabBar />
          </div>
        </ShopLangProvider>
        </ThemeProvider>
        <PWARegister />
        <Toaster />
      </body>
    </html>
  );
}
