"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useShopLangT } from "./shop-i18n-helpers";

/**
 * Карта по клику («фасад»): до клика показываем лёгкую заглушку,
 * iframe Яндекс.Карт (мегабайты JS + канвас) создаётся только по нажатию.
 * Так карта не грузится при каждом заходе на страницу и не отнимает
 * ресурс композитора при прокрутке на мобильных.
 */
export function LazyMap({ src, className }: { src: string; className: string }) {
  const { lang, tr } = useShopLangT();
  const [load, setLoad] = useState(false);

  if (load) {
    return <iframe title="TBS Inform map" src={src} className={className} loading="lazy" />;
  }

  return (
    <button
      type="button"
      onClick={() => setLoad(true)}
      aria-label={tr({ ru: "Показать карту", uz: "Xaritani ko'rsatish", en: "Show map" })}
      className={`group relative flex w-full flex-col items-center justify-center gap-3 bg-[#eaf6fc] dark:bg-[#101C2E] ${className}`}
    >
      {/* Мягкая точечная подложка, как на карточках товаров */}
      <span className="absolute inset-0 bg-dots-sky opacity-40" aria-hidden />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0284c7] shadow-[0_10px_30px_-8px_rgba(2,132,199,0.45)] ring-1 ring-sky-100 transition-transform duration-300 group-hover:scale-110 dark:bg-white dark:ring-sky-500/30">
        <MapPin className="h-6 w-6" aria-hidden />
      </span>
      <span className="relative text-[13.5px] font-bold text-[#0369a1]">
        {tr({ ru: "Показать карту", uz: "Xaritani ko'rsatish", en: "Show map" })}
      </span>
      <span className="relative text-[11.5px] font-semibold text-slate-400 dark:text-slate-500">
        {tr({ ru: "площадь Хамида Алимжана, 13Б", uz: "Hamid Alimjon maydoni, 13B", en: "Hamid Alimjan square, 13B" })}
      </span>
    </button>
  );
}
