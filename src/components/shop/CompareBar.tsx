"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, X } from "lucide-react";
import { shopStore, useShopState } from "@/lib/shop/store";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/** Плавающая панель сравнения: появляется, когда выбраны товары */
export function CompareBar() {
  const { compare } = useShopState();
  const { lang } = useShopLangT();
  const pathname = usePathname();

  if (compare.length === 0 || pathname === "/sravnenie") return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[46] flex justify-center px-4 lg:bottom-4">
      {/* Над нижней таб-панелью мобильной версии (та — h-16), на десктопе — как раньше */}
      <div className="flex items-center gap-3 rounded-2xl bg-white py-2.5 pl-5 pr-2.5 shadow-[0_18px_44px_-12px_rgba(2,132,199,0.45)] ring-1 ring-slate-200 dark:bg-[#0F1A2B] dark:ring-slate-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-[#0284c7] dark:bg-sky-500/15" aria-hidden>
          <ArrowLeftRight className="h-4.5 w-4.5" />
        </span>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {UI.compare[lang]}
          <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0284c7] px-1.5 text-[12px] font-extrabold text-white">
            {compare.length}
          </span>
        </p>
        <Link
          href="/sravnenie"
          className="rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-glow-sky-sm transition-transform hover:scale-[1.03] sm:px-5 sm:text-[13.5px] sm:hover:scale-[1.03] whitespace-nowrap"
        >
          {UI.compareGo[lang]}
        </Link>
        <button
          onClick={() => shopStore.clearCompare()}
          aria-label={UI.compareClear[lang]}
          title={UI.compareClear[lang]}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
