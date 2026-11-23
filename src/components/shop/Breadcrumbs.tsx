"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useShopLang } from "./ShopLangProvider";

const CRUMB_MAP: Record<string, { ru: string; uz: string; en: string }> = {
  "Главная": { ru: "Главная", uz: "Asosiy", en: "Home" },
  "Все радиостанции": { ru: "Все радиостанции", uz: "Barcha radiostansiyalar", en: "All radios" },
  "Радиостанции": { ru: "Радиостанции", uz: "Radiostansiyalar", en: "Radios" },
  "Услуги": { ru: "Услуги", uz: "Xizmatlar", en: "Services" },
  "Полезное": { ru: "Полезное", uz: "Foydali", en: "Useful" },
  "Контакты": { ru: "Контакты", uz: "Aloqa", en: "Contacts" },
  "О компании": { ru: "О компании", uz: "Kompaniya haqida", en: "About" },
  "Политика конфиденциальности": { ru: "Политика конфиденциальности", uz: "Maxfiylik siyosati", en: "Privacy policy" },
  "Ретрансляторы": { ru: "Ретрансляторы", uz: "Retranslyatorlar", en: "Repeaters" },
  "Любительские радиостанции": { ru: "Любительские радиостанции", uz: "Havaskor radiostansiyalar", en: "Amateur radios" },
  "Портативные радиостанции": { ru: "Портативные радиостанции", uz: "Portativ radiostansiyalar", en: "Portable radios" },
  "Мобильные радиостанции": { ru: "Мобильные радиостанции", uz: "Mobil radiostansiyalar", en: "Mobile radios" },
  "Аналоговые радиостанции": { ru: "Аналоговые радиостанции", uz: "Analog radiostansiyalar", en: "Analog radios" },
  "Радиостанции POC": { ru: "Радиостанции POC", uz: "POC radiostansiyalar", en: "PoC radios" },
  "Словарь терминов": { ru: "Словарь терминов", uz: "Atamalar lug‘ati", en: "Glossary" },
};

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const { lang } = useShopLang();

  // JSON-LD BreadcrumbList для поисковиков (метки — RU, как в разметке страницы)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: `https://tbs.uz${it.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="border-b border-sky-100/80 bg-gradient-to-b from-[#f0f9ff] to-white dark:border-slate-800 dark:from-[#0F1A2B] dark:to-[#0B1220]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 text-[12.5px] tracking-wide sm:px-6 lg:px-8">
        {items.map((it, i) => {
          const mapped = CRUMB_MAP[it.label];
          const label = mapped ? mapped[lang] : it.label;
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex min-w-0 items-center gap-2">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-500" aria-hidden />}
              {/* Текущая страница — последняя крошка: строгий тёмный текст без ссылки */}
              {last || !it.href ? (
                <span className="max-w-[70vw] truncate font-semibold text-slate-900 sm:max-w-sm dark:text-white" aria-current={last ? "page" : undefined}>
                  {label}
                </span>
              ) : (
                <Link
                  href={it.href}
                  className="group flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-500 transition-colors hover:text-[#0284c7] dark:text-slate-400 dark:hover:text-[#38bdf8]"
                >
                  {/* На мобильном «Главная» — только иконка дома, без слова */}
                  {i === 0 && <Home className="h-3.5 w-3.5 shrink-0 text-[#0ea5e9]" aria-hidden />}
                  <span className={`underline-offset-4 group-hover:underline group-hover:decoration-[#7dd3fc] ${i === 0 ? "hidden sm:inline" : ""}`}>
                    {label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
