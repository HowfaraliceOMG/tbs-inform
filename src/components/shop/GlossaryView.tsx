"use client";

import { useMemo, useState } from "react";
import { BookOpen, Phone, Search } from "lucide-react";
import { CONTACTS } from "@/lib/shop/data";
import { GLOSSARY } from "@/lib/shop/glossary";
import { useShopLangT } from "./shop-i18n-helpers";
import { Reveal } from "./Reveal";

/** Словарь терминов радиосвязи: поиск + карточки определений */
export function GlossaryView() {
  const { lang, tr } = useShopLangT();
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return GLOSSARY;
    return GLOSSARY.filter(
      (t) =>
        t.term.toLowerCase().includes(query) ||
        (t.full ?? "").toLowerCase().includes(query) ||
        t.def[lang].toLowerCase().includes(query),
    );
  }, [q, lang]);

  const countLabel = tr({
    ru: `Терминов: ${GLOSSARY.length}`,
    uz: `Atamalar: ${GLOSSARY.length}`,
    en: `${GLOSSARY.length} terms`,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Баннер */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-[#bae6fd] px-6 py-14 text-center text-slate-900 dark:from-sky-500/15 dark:via-sky-500/10 dark:to-sky-500/15 dark:text-white">
        <div className="absolute inset-0 bg-grid-sky opacity-60" aria-hidden />
        <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-[#7dd3fc]/40 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-[#38bdf8]/25 blur-2xl" aria-hidden />
        <p className="eyebrow relative text-[#0369a1]">TBS INFORM • {tr({ ru: "СЛОВАРЬ", uz: "LUG‘AT", en: "GLOSSARY" })}</p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {tr({ ru: "Словарь терминов радиосвязи", uz: "Radi aloqa atamalari lug‘ati", en: "Radio communication glossary" })}
        </h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
          {tr({
            ru: "DMR, POC, транкинг, NXDN — простыми словами о том, что значат эти буквы на страницах каталога.",
            uz: "DMR, POC, trunking, NXDN — katalog sahifalaridagi bu atamalar oddiy so‘zlar bilan nima ma’noni anglatadi.",
            en: "DMR, POC, trunking, NXDN — what these abbreviations across the catalog actually mean, in plain words.",
          })}
        </p>
      </div>

      {/* Поиск + счётчик */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr({ ru: "Найти термин…", uz: "Atamani topish…", en: "Find a term…" })}
            aria-label={tr({ ru: "Поиск по словарю", uz: "Lug‘at bo‘yicha qidirish", en: "Search the glossary" })}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] text-slate-800 shadow-[0_2px_16px_rgba(15,23,42,0.04)] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 dark:border-slate-700 dark:bg-[#0F1A2B] dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </label>
        <span className="shrink-0 rounded-full bg-[#e0f2fe] px-4 py-2 text-[13px] font-bold text-[#075985] dark:bg-sky-500/15">{countLabel}</span>
      </div>

      {/* Карточки терминов */}
      {items.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={(i % 2) * 80} className="h-full">
              <article
                className="group h-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#7dd3fc] hover:shadow-[0_18px_44px_-14px_rgba(2,132,199,0.3)] dark:border-slate-800 dark:bg-[#101C2E] dark:hover:border-[#38bdf8]/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-extrabold tracking-tight text-[#075985]">{t.term}</h2>
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e0f2fe] text-[#0284c7] transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/15" aria-hidden>
                    <BookOpen className="h-4 w-4" />
                  </span>
                </div>
                {t.full && <p className="mt-0.5 text-[12px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t.full}</p>}
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-200">{t.def[lang]}</p>
              </article>
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-[15px] text-slate-500 dark:text-slate-400">
          {tr({ ru: "Ничего не нашлось — попробуйте другое слово.", uz: "Hech narsa topilmadi — boshqa so‘z bilan urinib ko‘ring.", en: "Nothing found — try another word." })}
        </p>
      )}

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl bg-[#f0f9ff] px-6 py-7 text-center ring-1 ring-[#bae6fd] sm:flex-row sm:text-left dark:bg-sky-500/10 dark:ring-sky-500/30">
        <p className="max-w-xl text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
          {tr({
            ru: "Не нашли нужный термин или подбираете радиостанцию впервые? Наши инженеры объяснят всё по телефону.",
            uz: "Kerakli atama topilmadimi yoki birinchi marta radio tanlaysizmi? Muhandislarimiz hammasini telefon orqali tushuntiradi.",
            en: "Can't find a term or choosing your first radio? Our engineers will explain everything over the phone.",
          })}
        </p>
        <a
          href={CONTACTS.phoneHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0284c7] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_20px_-6px_rgba(2,132,199,0.6)] transition-transform hover:scale-[1.02]"
        >
          <Phone className="h-4 w-4" />
          {CONTACTS.phone}
        </a>
      </div>
    </div>
  );
}
