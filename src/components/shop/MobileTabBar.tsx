"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, LayoutGrid, MapPin, Search } from "lucide-react";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/** Нижняя таб-панель мобильной версии: постоянный доступ к разделам одним
    большим пальцем, в центре — приподнятая круглая кнопка ПОИСКА (открывает
    поисковую панель под шапкой через событие tbs:open-search → ShopHeader).
    Видна только < lg (на десктопе навигация в шапке). Высота 4rem учтена
    спейсером в layout и оффсетами куки-бара/панели сравнения. */
const TABS = [
  { href: "/", key: "home" as const, Icon: Home },
  { href: "/vse-radiostancii", key: "radios" as const, Icon: LayoutGrid },
  { href: "/poleznoe", key: "useful" as const, Icon: BookOpen },
  { href: "/contact", key: "contacts" as const, Icon: MapPin },
];

export function MobileTabBar() {
  const { lang, tr } = useShopLangT();
  const pathname = usePathname();
  const searchLabel = tr({ ru: "Поиск", uz: "Qidiruv", en: "Search" });

  return (
    <nav
      aria-label="Mobile tabs"
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgb(2_132_199/0.10)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-[#101C2E]/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-5">
        {/* 2 обычных таба слева */}
        {TABS.slice(0, 2).map(({ href, key, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const label = UI[key][lang];
          return (
            <Link key={href} href={href} className="flex items-center justify-center" aria-current={active ? "page" : undefined}>
              <span className="flex flex-col items-center justify-center gap-1">
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-[#0284c7]" : "text-slate-400 dark:text-slate-500"}`} />
                <span className={`text-[10px] font-bold leading-none transition-colors ${active ? "text-[#0284c7]" : "text-slate-500 dark:text-slate-400"}`}>
                  {label}
                </span>
              </span>
            </Link>
          );
        })}

        {/* ПОИСК — приподнятая круглая кнопка в центре панели */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("tbs:open-search"))}
          aria-label={searchLabel}
          className="flex flex-col items-center justify-center"
        >
          <span className="flex h-14 w-14 -translate-y-6 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-glow-sky ring-4 ring-white transition-transform active:scale-95">
            <Search className="h-6 w-6" aria-hidden />
          </span>
          <span className="-mt-4 text-[10px] font-bold uppercase leading-none tracking-wide text-[#0284c7]">{searchLabel}</span>
        </button>

        {/* 2 обычных таба справа: Полезное и Контакты */}
        {TABS.slice(2).map(({ href, key, Icon }) => {
          const external = href.startsWith("tel:");
          const label = external
            ? tr({ ru: "Позвонить", uz: "Qo‘ng‘iroq", en: "Call" })
            : UI[key][lang];
          const active = !external && (href === "/" ? pathname === "/" : pathname.startsWith(href));
          const content = (
            <span className="flex flex-col items-center justify-center gap-1">
              <Icon className={`h-5 w-5 transition-colors ${active ? "text-[#0284c7]" : "text-slate-400 dark:text-slate-500"}`} />
              <span className={`text-[10px] font-bold leading-none transition-colors ${active ? "text-[#0284c7]" : "text-slate-500 dark:text-slate-400"}`}>{label}</span>
            </span>
          );
          return external ? (
            <a key={href} href={href} className="flex items-center justify-center" aria-label={label}>
              {content}
            </a>
          ) : (
            <Link key={href} href={href} className="flex items-center justify-center" aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
