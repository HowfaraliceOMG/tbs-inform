"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, X } from "lucide-react";
import { bySlug, type ShopProduct } from "@/lib/shop/data";
import { compareRows } from "@/lib/shop/specs";
import { shopStore, useShopState } from "@/lib/shop/store";
import { Stars } from "./ProductCard";
import { useReviewStats, realRating } from "@/lib/shop/review-stats";
import { UI, useShopLangT } from "./shop-i18n-helpers";

export function CompareView() {
  const { compare } = useShopState();
  const { lang } = useShopLangT();
  // Реальные рейтинги отзывов: без отзывов звёзды в сравнении не рисуются
  const stats = useReviewStats();

  const products = compare.map((s) => bySlug(s)).filter((p): p is ShopProduct => Boolean(p));
  const rows = compareRows(products, lang);

  /* ── Пустое состояние ── */
  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-[#0284c7] ring-1 ring-sky-200 dark:bg-sky-500/15 dark:ring-sky-500/30">
          <ArrowLeftRight className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{UI.compareEmpty[lang]}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{UI.compareEmptyText[lang]}</p>
        <Link
          href="/vse-radiostancii"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 px-7 py-3 text-[15px] font-bold text-white shadow-glow-sky transition-transform hover:scale-[1.03]"
        >
          {UI.compareBack[lang]}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-[#0284c7]">TBS INFORM</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{UI.compareTitle[lang]}</h1>
        </div>
        <button
          onClick={() => shopStore.clearCompare()}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13.5px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
        >
          {UI.compareClear[lang]}
        </button>
      </div>

      <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[#f8fafc] dark:border-slate-800 dark:bg-white/[0.04]">
              <th className="w-40 min-w-36 px-4 py-4 align-bottom text-[11.5px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:w-48">
                {UI.compareSpecs[lang]}
              </th>
              {products.map((p) => (
                <th key={p.slug} className="min-w-48 px-4 py-4 align-top">
                  <div className="relative block">
                    <Link href={`/product/${p.slug}`} className="group relative mx-auto block h-24 w-full max-w-40 bg-white">
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        sizes="160px"
                        className="object-contain transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                    </Link>
                    <button
                      onClick={() => shopStore.removeCompare(p.slug)}
                      aria-label={`${UI.compareRemove[lang]}: ${p.name}`}
                      title={UI.compareRemove[lang]}
                      className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:bg-white/[0.06] dark:text-slate-500 dark:ring-slate-700 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <Link
                      href={`/product/${p.slug}`}
                      className="mt-2 block text-[15px] font-extrabold leading-snug tracking-tight text-slate-900 transition-colors hover:text-[#0284c7] dark:text-white dark:hover:text-[#38bdf8]"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-1.5 flex items-center gap-2">
                      {(() => {
                        const rv = realRating(p.slug, stats);
                        return rv > 0 ? <Stars value={rv} size="h-3.5 w-3.5" /> : null;
                      })()}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[13.5px] leading-relaxed">
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-3 align-top text-[12px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{UI.brand[lang]}</th>
              {products.map((p) => (
                <td key={p.slug} className="px-4 py-3 align-top font-semibold text-slate-800 dark:text-slate-200">
                  {p.brand}
                </td>
              ))}
            </tr>
            {rows.map((r) => (
              <tr key={r.key} className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${r.same ? "bg-slate-50/60 text-slate-400 dark:bg-white/[0.04] dark:text-slate-500" : ""}`}>
                <th className="px-4 py-3 align-top text-[12px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{r.key}</th>
                {r.values.map((v, i) => (
                  <td key={i} className={`px-4 py-3 align-top ${r.same ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12.5px] text-slate-400 dark:text-slate-500">
        {lang === "ru"
          ? "Серым отмечены одинаковые характеристики. Наличие и цены уточняйте по телефону."
          : lang === "uz"
            ? "Bir xil xususiyatlar kulrang bilan belgilangan. Mavjudlik va narxlar bo‘yicha telefon orqali murojaat qiling."
            : "Identical specifications are dimmed. Please call us to check availability and prices."}
      </p>
    </div>
  );
}
