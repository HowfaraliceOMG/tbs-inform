"use client";

import { CONTACTS } from "@/lib/shop/data";
import { KIND_COLOR, KIND_LABEL } from "@/lib/shop/projects-map";
import type { MarkerKind } from "@/lib/shop/projects-map";
import { useShopLangT } from "./shop-i18n-helpers";

/** Легенда карты проектов — отдельный лёгкий компонент (без leaflet) */
export function MapLegend() {
  const { lang } = useShopLangT();
  const kinds: MarkerKind[] = ["office", "airport", "industry", "venue"];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      {kinds.map((k) => (
        <span key={k} className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-400">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border-[3px] bg-white shadow-sm dark:bg-white"
            style={{ borderColor: KIND_COLOR[k] }}
            aria-hidden
          />
          {KIND_LABEL[k][lang]}
        </span>
      ))}
      <a
        href={CONTACTS.phoneHref}
        className="ml-auto hidden text-[13px] font-bold text-[#0284c7] transition-colors hover:text-[#0369a1] sm:inline"
      >
        {CONTACTS.phone}
      </a>
    </div>
  );
}
