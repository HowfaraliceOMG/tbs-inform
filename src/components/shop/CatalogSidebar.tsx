"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Folder, FolderOpen } from "lucide-react";
import { BRANDS, CATEGORIES, PRODUCTS } from "@/lib/shop/data";
import { CAT_META } from "@/lib/shop/cats";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/** Русские имена категорий в данных → slug */
const CAT_SLUG: Record<string, string> = {
  "Любительские радиостанции": "lyubitelskie",
  "Портативные радиостанции": "portativnye",
  "Мобильные радиостанции": "mobilnye",
  "Аналоговые радиостанции": "analogovye",
  "Радиостанции POC": "poc",
  "Ретрансляторы": "retranslyatory",
};

export function catSlugOf(ruCat: string): string | undefined {
  return CAT_SLUG[ruCat];
}

function SideTitle({ label }: { label: string }) {
  return (
    <div className="mb-3">
      <h3 className="eyebrow text-slate-900 dark:text-white">{label}</h3>
      <div className="mt-2 h-[3px] w-40 rounded-full bg-gradient-to-r from-[#0284c7] via-[#0284c7] to-[#38bdf8]" aria-hidden />
    </div>
  );
}

export function CatalogSidebar({
  activeCat,
  activeBrand,
}: {
  activeCat?: string;
  activeBrand?: string;
}) {
  const { lang, tr } = useShopLangT();
  const [openBrand, setOpenBrand] = useState<string | null>(activeBrand ?? null);

  const catLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label[lang] ?? slug;

  return (
    <aside className="space-y-8">
      <nav aria-label={UI.categories[lang]}>
        <SideTitle label={UI.categories[lang]} />
        <Link
          href="/vse-radiostancii"
          className={`flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-[15px] font-semibold transition-colors ${
            !activeCat && !activeBrand
              ? "bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white shadow-md"
              : "border border-slate-200/70 bg-white text-slate-800 hover:border-[#0284c7]/40 hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-200 dark:hover:border-[#38bdf8]/40 dark:hover:text-[#38bdf8]"
          }`}
        >
          {activeBrand || activeCat ? <Folder className="h-5 w-5 text-current opacity-80" /> : <FolderOpen className="h-5 w-5 text-current opacity-80" />}
          {UI.allRadios[lang]}
        </Link>
        <ul className="mt-2 space-y-1">
          {CATEGORIES.map((c) => {
            const active = activeCat === c.slug;
            const Icon = CAT_META[c.slug]?.icon ?? Folder;
            const count = PRODUCTS.filter((p) => p.cats.includes(c.label.ru)).length;
            return (
              <li key={c.slug}>
                <Link
                  href={`/vse-radiostancii?cat=${c.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${
                    active ? "bg-[#e0f2fe] ring-1 ring-[#0284c7]/25 dark:bg-sky-500/15" : "hover:bg-sky-50/70 dark:hover:bg-sky-500/10"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active ? "bg-[#0284c7] text-white shadow-glow-sky-sm" : "bg-[#e0f2fe]/70 text-[#0284c7] group-hover:bg-[#e0f2fe] dark:bg-sky-500/10 dark:group-hover:bg-sky-500/15"
                    }`}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`min-w-0 flex-1 text-[13.5px] leading-tight ${active ? "font-bold text-[#0369a1]" : "font-medium text-slate-600 dark:text-slate-400"}`}>
                    {catLabel(c.slug)}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      active ? "bg-white/80 text-[#0284c7]" : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label={UI.manufacturers[lang]}>
        <SideTitle label={UI.manufacturers[lang]} />
        <div className="space-y-1.5">
          {BRANDS.map((b) => {
            const href = `/radiostancii-${b.toLowerCase().replace(/\s+/g, "-")}`;
            const active = activeBrand === b;
            const count = PRODUCTS.filter((p) => p.brand === b).length;
            const open = openBrand === b;
            return (
              <div key={b}>
                <div
                  className={`flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-[15px] transition-colors ${
                    active
                      ? "bg-gradient-to-r from-[#0284c7] to-[#0369a1] font-semibold text-white shadow-md"
                      : "border border-slate-200/70 bg-white text-slate-800 hover:border-[#0284c7]/40 hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-200 dark:hover:border-[#38bdf8]/40 dark:hover:text-[#38bdf8]"
                  }`}
                >
                  <Link href={href} className="flex flex-1 items-center gap-2.5">
                    {active ? <FolderOpen className="h-5 w-5 opacity-80" /> : <Folder className="h-5 w-5 text-[#0284c7]" />}
                    {b}
                  </Link>
                  <span className="text-[11px] opacity-70">{count}</span>
                  <button
                    aria-label={`${b} categories`}
                    aria-expanded={open}
                    onClick={() => setOpenBrand(open ? null : b)}
                    className="p-1 opacity-70 transition-transform hover:opacity-100"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {open && (
                  <ul className="ml-8 mt-1 space-y-0.5 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                    {CATEGORIES.filter((c) => PRODUCTS.some((p) => p.brand === b && p.cats.includes(c.label.ru))).map((c) => {
                      const count = PRODUCTS.filter((p) => p.brand === b && p.cats.includes(c.label.ru)).length;
                      return (
                        <li key={c.slug}>
                          <Link
                            href={`${href}?cat=${c.slug}`}
                            className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm text-slate-600 transition-colors hover:text-[#0284c7] dark:text-slate-400 dark:hover:text-[#38bdf8]"
                          >
                            <span className="flex items-center gap-2">
                              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden />
                              {catLabel(c.slug)}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{count}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
