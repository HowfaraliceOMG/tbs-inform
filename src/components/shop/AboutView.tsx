"use client";

import Image from "next/image";
import {
  BadgeCheck,
  Building2,
  Handshake,
  History,
  Radio,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { ABOUT_TEXT } from "@/lib/shop/content";
import { PRODUCTS } from "@/lib/shop/data";
import {
  ABOUT_ACTIVITIES,
  ABOUT_CLIENTS,
  ABOUT_CLIENTS_NOTE,
  ABOUT_FOUNDER,
  ABOUT_HISTORY,
  ABOUT_SECTION_ACTIVITIES,
  ABOUT_SECTION_CLIENTS,
  ABOUT_SECTION_HISTORY,
} from "@/lib/shop/about-history";
import { useShopLangT } from "./shop-i18n-helpers";

/** Ссылки в тексте, как на tbs.uz: мини-разметка [анкор](URL) -> <a> в новом окне */
function renderLinked(text: string) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <a
        key={i}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#0284c7] underline decoration-[#7dd3fc] underline-offset-2 transition-colors hover:text-[#0369a1] hover:decoration-[#0369a1]"
      >
        {m[1]}
      </a>
    );
  });
}

export function AboutView() {
  const { lang, tr } = useShopLangT();

  // Вводный текст — как на tbs.uz: абзац 1 — в баннер, 2–3 — в карточку «О предприятии»
  const paras = ABOUT_TEXT[lang].split("\n\n");
  const introBody = paras.slice(1, 3);

  const features = [
    {
      icon: BadgeCheck,
      label: {
        ru: "Поставляем продукцию 6 мировых брендов",
        uz: "6 jahon brendi mahsulotini yetkazib beramiz",
        en: "We supply products from 6 global brands",
      },
    },
    {
      icon: Radio,
      label: {
        ru: "Более 35 моделей радиостанций в наличии",
        uz: "50 dan ortiq radiostansiya modellari",
        en: "Over 35 radio models available",
      },
    },
    {
      icon: Wrench,
      label: {
        ru: "Проектирование, монтаж и сервис систем связи",
        uz: "Tizimlarni loyihalash, montaj va servis",
        en: "Design, installation and maintenance",
      },
    },
    {
      icon: Handshake,
      label: {
        ru: "Содействие в получении разрешений и частот",
        uz: "Ruxsat va chastotalar olishda ko‘maklashish",
        en: "Assistance with permits and frequencies",
      },
    },
  ];

  // Живые цифры: бренды, модели и клиенты берутся из данных каталога/справочников
  const stats = [
    { n: "30+", label: { ru: "ЛЕТ ОПЫТА", uz: "YIL TAJRIBA", en: "YEARS OF EXPERIENCE" } },
    // Hytera больше не в списке поставляемых брендов — фиксируем 6
    { n: "6", label: { ru: "МИРОВЫХ БРЕНДОВ", uz: "JAHON BRENDI", en: "GLOBAL BRANDS" } },
    { n: String(PRODUCTS.length), label: { ru: "МОДЕЛЕЙ В КАТАЛОГЕ", uz: "MODEL KATALOGDA", en: "MODELS IN OUR CATALOG" } },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Баннер — в стиле страницы «Услуги» */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-[#bae6fd] px-6 py-14 text-center text-slate-900 dark:from-sky-500/15 dark:via-sky-500/10 dark:to-sky-500/15 dark:text-white">
        <div className="absolute inset-0 bg-grid-sky opacity-60" aria-hidden />
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#7dd3fc]/40 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-[#38bdf8]/25 blur-2xl" aria-hidden />
        <p className="eyebrow relative text-[#0369a1]">TBS INFORM • {tr({ ru: "С 1996 ГОДА", uz: "1996-YILDAN", en: "SINCE 1996" })}</p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {tr({ ru: "О компании", uz: "Kompaniya haqida", en: "About the company" })}
        </h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
          {paras[0]}
        </p>
        <span className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[12.5px] font-semibold tracking-wide text-[#0369a1] ring-1 ring-[#38bdf8]/50 dark:bg-white/[0.06]">
          <Radio className="h-4 w-4" />
          {tr({
            ru: "Полный комплекс услуг: от консультаций до сервисного обслуживания",
            uz: "To‘liq xizmatlar majmui: maslahatdan servisgacha",
            en: "Full range of services: from consulting to maintenance",
          })}
        </span>
      </div>

      {/* Стат-карточки — в стиле страницы «Услуги» */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-8 text-center shadow-[0_2px_16px_rgba(15,23,42,0.05)] sm:px-6 dark:border-slate-800 dark:bg-[#101C2E]">
            <div className="text-3xl font-bold tracking-wide text-[#0284c7] sm:text-4xl">{s.n}</div>
            <div className="mt-2 text-[12px] font-semibold uppercase leading-snug tracking-wide text-slate-500 dark:text-slate-400">{s.label[lang]}</div>
          </div>
        ))}
      </div>

      {/* Карточки-секции — единый язык со страницей «Услуги» */}
      <div className="mt-10 space-y-6">
        {/* ── О предприятии ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
          <div className="flex items-center gap-4 border-b border-slate-100 bg-[#f8fafc] px-6 py-5 dark:border-slate-800 dark:bg-white/[0.04]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] dark:bg-sky-500/15">
              <Building2 className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 sm:text-xl dark:text-white">
              {tr({ ru: "О предприятии", uz: "Korxona haqida", en: "About the enterprise" })}
            </h2>
          </div>
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
              {introBody.map((p, i) =>
                i === introBody.length - 1 ? (
                  <p key={i} className="rounded-2xl border border-sky-100 bg-[#f0f9ff] px-5 py-4 text-[14.5px] font-medium text-[#075985] dark:border-sky-500/20 dark:bg-sky-500/10">
                    {p}
                  </p>
                ) : (
                  <p key={i}>{p}</p>
                ),
              )}
            </div>
            <div className="grid grid-cols-2 content-start gap-3">
              {features.map((f, i) => (
                <div key={i} className="rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100 transition-colors hover:bg-[#f0f9ff] hover:ring-sky-100 dark:bg-white/[0.04] dark:ring-slate-800 dark:hover:bg-sky-500/10 dark:hover:ring-sky-500/30">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#0284c7] ring-1 ring-sky-100 dark:bg-white/[0.06] dark:ring-sky-500/30">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-200">{f.label[lang]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── История — весь текст с tbs.uz/o-kompanii ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
          <div className="flex items-center gap-4 border-b border-slate-100 bg-[#f8fafc] px-6 py-5 dark:border-slate-800 dark:bg-white/[0.04]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] dark:bg-sky-500/15">
              <History className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 sm:text-xl dark:text-white">
              {tr(ABOUT_SECTION_HISTORY)}
            </h2>
          </div>
          <div className="grid gap-10 px-6 py-7 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-200">{ABOUT_FOUNDER[lang]}</p>
              {/* Хронология: год на линии, событие справа */}
              <ol className="relative ml-2 mt-8 space-y-7 border-l-2 border-sky-100 pl-8 sm:pl-12 dark:border-sky-500/20">
                {ABOUT_HISTORY.map((h, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute -left-8 top-0 flex h-7 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] px-2.5 text-[11.5px] font-extrabold tracking-wide text-white shadow-sm sm:-left-12 sm:px-3"
                      aria-hidden
                    >
                      {h.year === "now" ? tr({ ru: "Сейчас", uz: "Hozir", en: "Today" }) : h.year}
                    </span>
                    <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">{renderLinked(h.text[lang])}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              {/* Лицензия — скан с tbs.uz */}
              <figure className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800">
                <Image
                  src="/tbs-img/about-license.jpg"
                  alt={tr({ ru: "Лицензия TBS Inform", uz: "TBS Inform litsenziyasi", en: "TBS Inform license" })}
                  width={900}
                  height={640}
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="h-auto w-full object-cover"
                />
                <figcaption className="border-t border-slate-100 bg-white px-5 py-3 text-[12.5px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-[#0F1A2B] dark:text-slate-400">
                  {tr({ ru: "Лицензия на деятельность", uz: "Faoliyat litsenziyasi", en: "Business license" })}
                </figcaption>
              </figure>
              {/* Оборудование: ремонт и настройка */}
              <figure className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800">
                <Image
                  src="/about-equipment-v2.png"
                  alt={tr({
                    ru: "Настройка и ремонт радиооборудования в сервисной зоне TBS Inform",
                    uz: "TBS Inform servis zonasida radio uskunalarini sozlash va ta’mirlash",
                    en: "Adjusting and repairing radio equipment in the TBS Inform service area",
                  })}
                  width={1344}
                  height={768}
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="h-auto w-full object-cover"
                />
                <figcaption className="border-t border-slate-100 bg-white px-5 py-3 text-[12.5px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-[#0F1A2B] dark:text-slate-400">
                  {tr({ ru: "Сервисная зона TBS Inform", uz: "TBS Inform servis zonasi", en: "TBS Inform service area" })}
                </figcaption>
              </figure>
            </div>
          </div>
        </div>

        {/* ── Основные виды деятельности — 4 пункта с tbs.uz ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
          <div className="flex items-center gap-4 border-b border-slate-100 bg-[#f8fafc] px-6 py-5 dark:border-slate-800 dark:bg-white/[0.04]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] dark:bg-sky-500/15">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 sm:text-xl dark:text-white">
              {tr(ABOUT_SECTION_ACTIVITIES)}
            </h2>
          </div>
          <ol className="grid gap-3 px-6 py-7 sm:grid-cols-2">
            {ABOUT_ACTIVITIES.map((a, i) => (
              <li key={i} className="flex items-start gap-3.5 rounded-xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100 transition-colors hover:bg-[#f0f9ff] hover:ring-sky-100 dark:bg-white/[0.04] dark:ring-slate-800 dark:hover:bg-sky-500/10 dark:hover:ring-sky-500/30">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0284c7] text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-200">{a[lang]}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Основные клиенты — лого и список с tbs.uz ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
          <div className="flex items-center gap-4 border-b border-slate-100 bg-[#f8fafc] px-6 py-5 dark:border-slate-800 dark:bg-white/[0.04]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] dark:bg-sky-500/15">
              <Users className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 sm:text-xl dark:text-white">
              {tr(ABOUT_SECTION_CLIENTS)}
            </h2>
          </div>
          <div className="px-6 py-7">
            {/* Полный перечень клиентов с tbs.uz */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ABOUT_CLIENTS.map((c) => (
                <div key={c} className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-[12.5px] font-semibold leading-snug text-slate-600 ring-1 ring-slate-100 transition-colors hover:bg-[#f0f9ff] hover:text-[#0369a1] hover:ring-sky-100 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-slate-800 dark:hover:bg-sky-500/10 dark:hover:text-[#38bdf8] dark:hover:ring-sky-500/30">
                  {c}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{ABOUT_CLIENTS_NOTE[lang]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
