"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { BadgeCheck, Wrench, MapPinned } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { HeroSlider } from "@/components/shop/HeroSlider";
import { Reveal } from "@/components/shop/Reveal";
import { MarqueeAuto } from "./home/MarqueeAuto";
import { ARRIVALS, bySlug, CLIENT_LOGOS } from "@/lib/shop/data";
import { UI, useShopLangT } from "@/components/shop/shop-i18n-helpers";

// «Вы недавно смотрели» почти всегда пуст (нет истории) — вынесен из основного
// бандла и не участвует в гидрации, пока не понадобится
const RecentlyViewed = dynamic(
  () => import("@/components/shop/RecentlyViewed").then((m) => m.RecentlyViewed),
  { ssr: false }
);

// Человекочитаемое имя клиента из имени файла логотипа (для alt)
function logoName(src: string) {
  const raw = src.split("catalog__Client__")[1] ?? "";
  const name = decodeURIComponent(raw).replace(/(\.[a-z0-9]+)+$/i, "").replace(/_/g, " ").trim();
  // служебные имена вида "(1)" / хэши заменяем нейтральной подписью
  if (!name || /^\(?\d+\)?$/.test(name) || /^[0-9a-f]{16,}$/i.test(name)) return "Клиент TBS Inform";
  return name;
}

// Лента брендов под слайдером: официальные логотипы (public/tbs-img/brand/).
// Все логотипы цветные в ОБЕИХ темах, цвет брендов не перекрашивается:
//  • по умолчанию — в светлой теме прямо на ленте, в тёмной — на белой
//    плашке, чтобы цветной логотип читался на тёмном фоне;
//  • Kirisun — цветной логотип с kirisun.net (тёмно-синий скрипт #1e1b6f +
//    голубой росчерк), белая плашка в обеих темах (chipLight);
//  • Lisheng — аутентичный логотип с lishengradio.com выполнен белым текстом
//    (перекрашивать нельзя) — показываем как есть на тёмной плашке (tile).
const BRAND_RIBBON: {
  key: string;
  name: string;
  w: number;
  h: number;
  src?: string;
  tile?: boolean;
  chipLight?: boolean;
}[] = [
  { key: "telosystems", name: "TELOX by Telo Systems", w: 296, h: 64 },
  { key: "kenwood", name: "KENWOOD", w: 381, h: 64 },
  { key: "kirisun", name: "Kirisun", w: 149, h: 38, src: "/tbs-img/brand/kirisun-blue.png", chipLight: true },
  { key: "lisheng", name: "Lisheng", w: 250, h: 46, src: "/tbs-img/brand/lisheng-clean.png", tile: true },
  { key: "yanton", name: "YANTON", w: 282, h: 44 },
];

function SectionHead({ eyebrowText, title }: { eyebrowText: string; title: string }) {
  return (
    <div className="text-center">
      <p className="eyebrow flex items-center justify-center gap-2 text-[#0284c7]">
        <span className="inline-block h-px w-7 bg-[#0ea5e9]" aria-hidden />
        {eyebrowText}
        <span className="inline-block h-px w-7 bg-[#0ea5e9]" aria-hidden />
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[30px] dark:text-white">{title}</h2>
    </div>
  );
}

export function HomePageClient() {
  const { lang, tr } = useShopLangT();
  // порядок как на tbs.uz (15 товаров)
  const arrivals = ARRIVALS.filter((s) => bySlug(s));

  const features = [
    { icon: BadgeCheck, t: UI.featDealerT[lang], d: UI.featDealerD[lang] },
    { icon: Wrench, t: UI.featServiceT[lang], d: UI.featServiceD[lang] },
    { icon: MapPinned, t: UI.featRegionT[lang], d: UI.featRegionD[lang] },
  ];

  return (
    <div>
      <HeroSlider />

      {/* Лента брендов: официальные логотипы, бесшовный круг (та же механика,
          что у карусели клиентов ниже). Края растворяются маской, при наведении
          прокрутка на паузе, вне экрана анимация не тратит ресурсы. */}
      <section aria-label={UI.brandRibbonLabel[lang]} className="border-b border-slate-100 bg-[#f8fafc] py-7 dark:border-slate-800 dark:bg-white/[0.02]">
        <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
          {UI.brandRibbonLabel[lang]}
        </p>
        <MarqueeAuto rowClassName="flex items-center gap-12 pr-12 sm:gap-16 sm:pr-16">
          {BRAND_RIBBON.map((b) => {
            const src = b.src ?? `/tbs-img/brand/${b.key}.png`;
            return (
              <div
                key={b.key}
                className={
                  b.tile
                    ? // аутентичный белый логотип: тёмная плашка в обеих темах
                      "flex shrink-0 items-center rounded-2xl border border-white/10 bg-[#0d1828] px-5 py-2.5"
                    : b.chipLight
                      ? // цветной логотип без перекраски: белая плашка в обеих темах
                        "flex shrink-0 items-center rounded-2xl border border-slate-200/80 bg-white px-5 py-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
                      : // цветной логотип в обеих темах: в тёмной — на белой плашке
                        "flex shrink-0 items-center opacity-75 transition-opacity duration-300 hover:opacity-100 dark:rounded-2xl dark:border dark:border-white/10 dark:bg-white dark:px-5 dark:py-2.5 dark:opacity-100 dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                }
              >
                <Image src={src} alt={b.name} width={b.w} height={b.h} className="h-7 w-auto sm:h-8" />
              </div>
            );
          })}
        </MarqueeAuto>
      </section>

      {/* Новые поступления — на xl+ контейнер шире (1600px), чтобы пять
          колонок не сжимали карточки слишком узко */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8 xl:max-w-[1600px]">
        <Reveal>
          <SectionHead
            eyebrowText={tr({ ru: "КАТАЛОГ • НОВИНКИ", uz: "KATALOG • YANGLIKLAR", en: "CATALOG • NEW" })}
            title={UI.newTitle[lang]}
          />
        </Reveal>
        <Reveal delay={90}>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {arrivals.map((s) => {
              const p = bySlug(s);
              return p ? <ProductCard key={s} p={p} /> : null;
            })}
          </div>
        </Reveal>
      </section>

      {/* Преимущества — ниже первого экрана: рендер за пределами вьюпорта пропускается */}
      <section className="cv-section mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 90}>
              <div
                className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0284c7]/40 hover:shadow-[0_18px_44px_-14px_rgba(2,132,199,0.3)] dark:border-slate-800 dark:bg-[#101C2E] dark:hover:border-[#38bdf8]/40"
              >
                {/* Радиальный градиент вместо blur-круга: тот же мягкий адресный акцент,
                    но без filter: blur(), который на мобильных стоит дорого при перерисовке */}
                <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(2,132,199,0.10),transparent_70%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/15">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-[17px] font-extrabold text-slate-900 dark:text-white">{f.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Вы недавно смотрели */}
      <RecentlyViewed />

      {/* Наши клиенты — бесконечная карусель логотипов */}
      <section className="cv-section mt-16 border-y border-slate-100 bg-[#f8fafc] py-14 dark:border-slate-800 dark:bg-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead eyebrowText="TBS INFORM" title={UI.clientsTitle[lang]} />
          </Reveal>
        </div>
        {/* Лента зациклена: два одинаковых ряда подряд, сдвиг на -50% → бесшовный круг.
            Паузу вне экрана и при наведении держит MarqueeAuto — без setState:
            попадание ленты в экран не перерисовывает главную с 15 карточками. */}
        <MarqueeAuto
          className="mt-10"
          rowClassName="flex items-center gap-4 pr-4 sm:gap-5 sm:pr-5"
          mask="[mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
        >
          {CLIENT_LOGOS.map((src) => (
            <div
              key={src}
              className="relative flex h-16 w-36 shrink-0 items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-colors hover:border-sky-200 sm:h-20 sm:w-48 dark:border-slate-800 dark:bg-white dark:hover:border-sky-500/40"
            >
              <Image
                src={src}
                alt={logoName(src)}
                fill
                sizes="192px"
                className="object-contain p-3 opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:p-4"
              />
            </div>
          ))}
        </MarqueeAuto>
      </section>
    </div>
  );
}
