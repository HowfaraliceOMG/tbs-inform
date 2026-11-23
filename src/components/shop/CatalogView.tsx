"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { BRANDS, CATEGORIES, PRODUCTS, type ShopProduct } from "@/lib/shop/data";
import { CAT_META } from "@/lib/shop/cats";
import { PRODUCT_SPECS, SPEC_FACETS, matchSpecs } from "@/lib/shop/filters";
import { ProductCard } from "./ProductCard";
import { UI, useShopLangT } from "./shop-i18n-helpers";

const PAGE_SIZE = 12;

/* Сколько времени живёт сохранённое состояние каталога (sessionStorage) */
const SS_TTL = 30 * 60 * 1000; // 30 минут

type SavedCat = {
  cat?: string;
  brand?: string;
  query?: string;
  sort?: "default" | "name";
  specs?: Record<string, string[]>;
  page?: number;
  y?: number; // позиция прокрутки на момент ухода со страницы
  t?: number; // время последней активности
};

/* ── Скелетоны загрузки (плавная подмена при смене страницы/фильтров) ── */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#101C2E]" aria-hidden>
      <div className="p-3">
        <div className="h-44 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <div className="space-y-2.5 border-t border-slate-100 px-4 pb-4 pt-3.5 dark:border-slate-800">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-3.5 w-14 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.1]" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#101C2E]" aria-hidden>
      <div className="h-36 w-32 shrink-0 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06] sm:h-44 sm:w-52" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.1]" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}

export interface CatalogViewProps {
  initialCat?: string; // slug категории
  initialBrand?: string; // имя бренда
  initialQuery?: string; // поисковый запрос из ?q=
  title: string;
  titleKey?: string; // "all" | бренд | slug категории — для локализации заголовка
}

/** Русские имена категорий в данных по slug */
export const CAT_RU: Record<string, string> = {
  lyubitelskie: "Любительские радиостанции",
  portativnye: "Портативные радиостанции",
  mobilnye: "Мобильные радиостанции",
  analogovye: "Аналоговые радиостанции",
  poc: "Радиостанции POC",
  retranslyatory: "Ретрансляторы",
};

function SideTitle({ label }: { label: string }) {
  return (
    <div className="mb-3">
      <h3 className="eyebrow text-slate-900 dark:text-white">{label}</h3>
      <div className="mt-2 h-[3px] w-28 rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]" aria-hidden />
    </div>
  );
}

export function CatalogView({ initialCat, initialBrand, initialQuery, title, titleKey }: CatalogViewProps) {
  const { lang, tr } = useShopLangT();
  const heading = useMemo(() => {
    if (titleKey === "all") return UI.allProducts[lang];
    if (titleKey && titleKey !== "all") {
      const cat = CATEGORIES.find((c) => c.slug === titleKey);
      if (cat) return cat.label[lang];
      // бренд: "Радиостанции Kenwood" / "Kenwood radiostansiyalari" / "Kenwood radios"
      if (lang === "ru") return title;
      if (lang === "uz") return `${titleKey} radiostansiyalari`;
      return `${titleKey} radios`;
    }
    return title;
  }, [title, titleKey, lang, tr]);
  const [cat, setCat] = useState<string | undefined>(initialCat);
  const [brand, setBrand] = useState<string | undefined>(initialBrand);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [sort, setSort] = useState<"default" | "name">("default");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [openBrand, setOpenBrand] = useState<string | null>(initialBrand ?? null);
  const [mobileFilters, setMobileFilters] = useState(false);
  // Фасетные фильтры по характеристикам (тип/стандарт/диапазон/защита)
  const [specs, setSpecs] = useState<Record<string, string[]>>({});
  const [openFacet, setOpenFacet] = useState<string | null>("std");
  // Плавный скелетон при смене страницы/фильтров
  const [pageLoading, setPageLoading] = useState(false);
  const gridTopRef = useRef<HTMLDivElement>(null);
  const specCount = Object.values(specs).reduce((s, v) => s + v.length, 0);

  /* ── Возврат в каталог с той же страницы: состояние листинга хранится в
        sessionStorage (ключ по пути), страница дублируется в ?page= URL.
        После открытого товара «Назад»/крошки возвращают на тот же листинг ── */
  const touchedRef = useRef(false); // были реальные изменения фильтров/страницы
  const ssKey = () => `tbs-cat:${window.location.pathname}`;
  // Сохранить только позицию прокрутки (не трогая фильтры в storage)
  const persistY = () => {
    try {
      const raw = sessionStorage.getItem(ssKey());
      const prev = raw ? JSON.parse(raw) : {};
      sessionStorage.setItem(ssKey(), JSON.stringify({ ...prev, y: Math.round(window.scrollY), t: Date.now() }));
    } catch {
      /* storage недоступен — работаем без восстановления */
    }
  };

  const bumpLoading = (scroll = false) => {
    touchedRef.current = true;
    setPageLoading(true);
    if (scroll) gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setPageLoading(false), 420);
  };

  const toggleSpec = (fid: string, vid: string) => {
    setSpecs((s) => {
      const cur = s[fid] ?? [];
      const next: Record<string, string[]> = { ...s, [fid]: cur.includes(vid) ? cur.filter((x) => x !== vid) : [...cur, vid] };
      if (next[fid].length === 0) delete next[fid];
      return next;
    });
    setPage(1);
    bumpLoading();
  };

  const clearFacet = (fid: string) => {
    setSpecs((s) => {
      const next = { ...s };
      delete next[fid];
      return next;
    });
    setPage(1);
    bumpLoading();
  };

  const filtered = useMemo<ShopProduct[]>(() => {
    const q = query.trim().toLowerCase();
    const list = PRODUCTS.filter((p) => {
      if (cat && !p.cats.includes(CAT_RU[cat])) return false;
      if (brand && p.brand !== brand) return false;
      if (q && !`${p.name} ${p.brand} ${p.short}`.toLowerCase().includes(q)) return false;
      if (!matchSpecs(p.slug, specs)) return false;
      return true;
    });
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, [cat, brand, query, sort, specs]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pages);
  const shown = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const catLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label[lang] ?? slug;

  const resetAll = () => {
    setCat(undefined);
    setBrand(undefined);
    setQuery("");
    setSpecs({});
    setPage(1);
    bumpLoading();
  };

  const hasFilters = Boolean(cat || brand || query || specCount > 0);

  /* ── Восстановление листинга при возврате («Назад», хлебные крошки, повторный визит в течение 30 мин) ── */
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const raw = sessionStorage.getItem(ssKey());
      const saved: SavedCat = raw ? JSON.parse(raw) : {};
      const fresh = typeof saved.t === "number" && Date.now() - saved.t < SS_TTL;
      // ?q= / ?cat= в URL — явный новый заход (поиск, ссылка): сохранённое состояние не применяем
      const explicit = Boolean(sp.get("q") || sp.get("cat"));
      const urlPage = Number.parseInt(sp.get("page") ?? "", 10);
      const urlPageOk = Number.isFinite(urlPage) && urlPage > 0;

      if (fresh && !explicit) {
        if (saved.cat && !initialCat) setCat(saved.cat);
        if (saved.brand && !initialBrand) setBrand(saved.brand);
        if (typeof saved.query === "string" && saved.query) setQuery(saved.query);
        if (saved.sort === "name") setSort(saved.sort);
        if (saved.specs && typeof saved.specs === "object") {
          const ok: Record<string, string[]> = {};
          const knownFacets = new Set(SPEC_FACETS.map((f) => f.id));
          for (const [k, v] of Object.entries(saved.specs)) {
            // фасеты, которых больше нет (удалены из SPEC_FACETS), не восстанавливаем
            if (knownFacets.has(k) && Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string")) ok[k] = v;
          }
          if (Object.keys(ok).length > 0) setSpecs(ok);
        }
      }
      const targetPage = urlPageOk ? urlPage : fresh && !explicit ? (saved.page ?? 1) : 1;
      if (targetPage > 1) setPage(targetPage);

      const y = fresh && !explicit ? (saved.y ?? 0) : 0;
      window.setTimeout(() => {
        if (y > 40) window.scrollTo({ top: y, behavior: "auto" });
        else if (targetPage > 1) gridTopRef.current?.scrollIntoView({ block: "start" });
      }, 60);
    } catch {
      /* приватный режим — работаем без восстановления */
    }
     
  }, []);

  // Фильтры/страница → sessionStorage (пишем только после реальных действий пользователя)
  const stateRef = useRef({ cat, brand, query, sort, specs, page: clampedPage });
  stateRef.current = { cat, brand, query, sort, specs, page: clampedPage };
  useEffect(() => {
    if (!touchedRef.current) return;
    try {
      const raw = sessionStorage.getItem(ssKey());
      const prev = raw ? JSON.parse(raw) : {};
      sessionStorage.setItem(
        ssKey(),
        // y сбрасываем: при смене фильтров позиция прокрутки устаревает
        JSON.stringify({ ...prev, ...stateRef.current, y: undefined, t: Date.now() }),
      );
    } catch {
      /* ignore */
    }
     
  }, [cat, brand, query, sort, specs, clampedPage]);

  // ?page= в URL — чтобы «Назад» работал и через долгое время (когда storage уже протух)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (clampedPage > 1) url.searchParams.set("page", String(clampedPage));
      else url.searchParams.delete("page");
      // важно: сохраняем history.state Next.js (иначе «Назад» может стать жёсткой перезагрузкой)
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    } catch {
      /* ignore */
    }
  }, [clampedPage]);

  // Позиция прокрутки: сохраняем при прокрутке (с троттлингом)
  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        persistY();
      }, 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer !== undefined) window.clearTimeout(timer);
    };
     
  }, []);

  /* ── Общая панель фильтров (сайдбар на десктопе, раскрытие на мобильных) ── */
  const filterPanel = (
    <>
      <nav aria-label={UI.categories[lang]} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
        <SideTitle label={UI.categories[lang]} />
        <button
          onClick={() => {
            setCat(undefined);
            setBrand(undefined);
            setPage(1);
            bumpLoading();
          }}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[14.5px] font-semibold transition-colors ${
            !cat && !brand
              ? "bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white shadow-glow-sky-sm"
              : "border border-slate-200/70 bg-white text-slate-800 hover:border-[#0284c7]/40 hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-200 dark:hover:border-[#38bdf8]/40 dark:hover:text-[#38bdf8]"
          }`}
        >
          {!cat && !brand ? <FolderOpen className="h-5 w-5 opacity-80" /> : <Folder className="h-5 w-5 opacity-80" />}
          {UI.allRadios[lang]}
        </button>
        <ul className="mt-2 space-y-1">
          {CATEGORIES.map((c) => {
            const active = cat === c.slug;
            const Icon = CAT_META[c.slug]?.icon ?? Folder;
            const count = PRODUCTS.filter((p) => p.cats.includes(c.label.ru)).length;
            return (
              <li key={c.slug}>
                <button
                  onClick={() => {
                    setCat(active ? undefined : c.slug);
                    setPage(1);
                    bumpLoading();
                  }}
                  aria-pressed={active}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
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
                  <span className={`min-w-0 flex-1 text-[13px] leading-tight ${active ? "font-bold text-[#0369a1]" : "font-medium text-slate-600 dark:text-slate-400"}`}>
                    {catLabel(c.slug)}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      active ? "bg-white/80 text-[#0284c7]" : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label={UI.manufacturers[lang]} className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
        <SideTitle label={UI.manufacturers[lang]} />
        <div className="space-y-1.5">
          {BRANDS.map((b) => {
            const active = brand === b;
            const count = PRODUCTS.filter((p) => p.brand === b).length;
            const open = openBrand === b;
            return (
              <div key={b}>
                <div
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
                    active
                      ? "bg-gradient-to-r from-[#0284c7] to-[#0369a1] font-semibold text-white shadow-glow-sky-sm"
                      : "border border-slate-200/70 bg-white text-slate-800 hover:border-[#0284c7]/40 hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-200 dark:hover:border-[#38bdf8]/40 dark:hover:text-[#38bdf8]"
                  }`}
                >
                  <button
                    onClick={() => {
                      setBrand(active ? undefined : b);
                      setPage(1);
                      bumpLoading();
                    }}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    {active ? <FolderOpen className="h-4.5 w-4.5 opacity-80" /> : <Folder className="h-4.5 w-4.5 text-[#0284c7]" />}
                    {b}
                  </button>
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
                  <ul className="ml-7 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-3 dark:border-slate-800">
                    {CATEGORIES.filter((c) => PRODUCTS.some((p) => p.brand === b && p.cats.includes(c.label.ru))).map((c) => {
                      const count = PRODUCTS.filter((p) => p.brand === b && p.cats.includes(c.label.ru)).length;
                      return (
                        <li key={c.slug}>
                          <button
                            onClick={() => {
                              setBrand(b);
                              setCat(c.slug);
                              setPage(1);
                              bumpLoading();
                            }}
                            className="flex w-full items-start justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] leading-snug text-slate-600 transition-colors hover:text-[#0284c7] dark:text-slate-400 dark:hover:text-[#38bdf8]"
                          >
                            <span className="flex items-start gap-2">
                              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden />
                              {catLabel(c.slug)}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{count}</span>
                          </button>
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

      {/* Фасетные фильтры по характеристикам */}
      <nav
        aria-label={tr({ ru: "Фильтры по характеристикам", uz: "Xarakteristika filtrlari", en: "Specification filters" })}
        className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]"
      >
        <SideTitle label={tr({ ru: "Характеристики", uz: "Xarakteristikalar", en: "Specifications" })} />
        <div className="space-y-1.5">
          {SPEC_FACETS.map((f) => {
            const open = openFacet === f.id;
            const sel = specs[f.id] ?? [];
            return (
              <div key={f.id} className={`rounded-xl border transition-colors ${open ? "border-[#0284c7]/30 bg-[#f0f9ff]/60 dark:border-[#38bdf8]/30 dark:bg-sky-500/10" : "border-slate-100 dark:border-slate-800"}`}>
                <button
                  onClick={() => setOpenFacet(open ? null : f.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">
                    <SlidersHorizontal className={`h-3.5 w-3.5 shrink-0 ${sel.length > 0 ? "text-[#0284c7]" : "text-slate-400 dark:text-slate-500"}`} aria-hidden />
                    <span className="truncate">{f.label[lang]}</span>
                    {sel.length > 0 && (
                      <span className="shrink-0 rounded-full bg-[#0284c7] px-1.5 py-0.5 text-[10px] font-bold text-white">{sel.length}</span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {open && (
                  <ul className="space-y-0.5 px-2 pb-2">
                    {f.values.map((v) => {
                      const checked = sel.includes(v.id);
                      const count = PRODUCTS.filter((p) => ((PRODUCT_SPECS[p.slug] ?? {})[f.id] ?? []).includes(v.id)).length;
                      if (count === 0) return null;
                      return (
                        <li key={v.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                              checked ? "bg-[#e0f2fe] font-semibold text-[#0369a1] dark:bg-sky-500/15" : "text-slate-600 hover:bg-white dark:text-slate-400 dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSpec(f.id, v.id)}
                              className="h-4 w-4 shrink-0 cursor-pointer accent-[#0284c7]"
                            />
                            <span className="min-w-0 flex-1 leading-tight">{v.label[lang]}</span>
                            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{count}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        {specCount > 0 && (
          <button
            onClick={() => {
              setSpecs({});
              setPage(1);
              bumpLoading();
            }}
            className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-[12.5px] font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
          >
            {UI.resetFilters[lang]}
          </button>
        )}
      </nav>
    </>
  );

  return (
    <div
      onClickCapture={(e) => {
        // уход по ссылке (в товар, категорию) — фиксируем позицию прокрутки
        const t = e.target as HTMLElement | null;
        if (t?.closest("a")) persistY();
      }}
    >
      {/* ── Шапка каталога: градиентная лента с заголовком и панелью управления ── */}
      <div className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-b from-[#f0f9ff] via-white to-white dark:border-slate-800 dark:from-[#0F1A2B] dark:via-[#0B1220] dark:to-[#0B1220]">
        <div className="absolute inset-0 bg-grid-sky opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-2 text-[#0284c7]">
                <span className="inline-block h-px w-8 bg-gradient-to-r from-[#0ea5e9] to-transparent" aria-hidden />
                {tr({ ru: "КАТАЛОГ • TBS INFORM", uz: "KATALOG • TBS INFORM", en: "CATALOG • TBS INFORM" })}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[34px] dark:text-white">
                {heading}
              </h1>
              <p className="mt-2 text-[12.5px] tracking-wide text-slate-500 dark:text-slate-400">
                {UI.found[lang]} {shown.length} {UI.of[lang]} {filtered.length}
              </p>
            </div>

            {/* Панель управления: поиск + сортировка + вид */}
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              <div className="relative w-full sm:w-64 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                    bumpLoading();
                  }}
                  placeholder={UI.searchPlaceholder[lang]}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm shadow-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/20 dark:border-slate-700 dark:bg-[#0F1A2B] dark:text-slate-200 dark:placeholder:text-slate-500"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      touchedRef.current = true;
                    }}
                    aria-label="Clear"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="relative shrink-0">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as "default" | "name");
                    setPage(1);
                    bumpLoading();
                  }}
                  aria-label={UI.sort[lang]}
                  className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-7 text-sm shadow-sm outline-none transition-colors focus:border-[#0284c7] dark:border-slate-700 dark:bg-[#0F1A2B] dark:text-slate-200"
                >
                  <option value="default">{UI.sortDefault[lang]}</option>
                  <option value="name">{UI.sortName[lang]}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>

              {/* Переключатель сетка/список */}
              <div className="hidden shrink-0 items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm md:flex dark:border-slate-700 dark:bg-[#0F1A2B]" role="group" aria-label={tr({ ru: "Вид каталога", uz: "Katalog ko'rinishi", en: "Catalog view" })}>
                <button
                  onClick={() => setView("grid")}
                  aria-pressed={view === "grid"}
                  title={UI.viewGrid[lang]}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    view === "grid" ? "bg-[#0284c7] text-white shadow-sm" : "text-slate-500 hover:text-[#0284c7] dark:text-slate-400 dark:hover:text-[#38bdf8]"
                  }`}
                >
                  <LayoutGrid className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setView("list")}
                  aria-pressed={view === "list"}
                  title={UI.viewList[lang]}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    view === "list" ? "bg-[#0284c7] text-white shadow-sm" : "text-slate-500 hover:text-[#0284c7] dark:text-slate-400 dark:hover:text-[#38bdf8]"
                  }`}
                >
                  <List className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Кнопка фильтров (мобильные/планшет) */}
              <button
                onClick={() => setMobileFilters((o) => !o)}
                aria-expanded={mobileFilters}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-[#0284c7] hover:text-[#0284c7] lg:hidden dark:border-slate-700 dark:bg-[#0F1A2B] dark:text-slate-200 dark:hover:border-[#38bdf8] dark:hover:text-[#38bdf8]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {UI.filters[lang]}
                {(cat || brand || specCount > 0) && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0284c7] px-1 text-[11px] font-bold text-white">
                    {(cat ? 1 : 0) + (brand ? 1 : 0) + specCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Активные фильтры — чипы */}
          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{UI.activeFilters[lang]}</span>
              {brand && (
                <button
                  onClick={() => {
                    setBrand(undefined);
                    setPage(1);
                    touchedRef.current = true;
                  }}
                  className="group flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-1.5 pl-3 pr-2 text-[13px] font-semibold text-[#0369a1] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                >
                  {brand}
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              {cat && (
                <button
                  onClick={() => {
                    setCat(undefined);
                    setPage(1);
                    bumpLoading();
                  }}
                  className="group flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-1.5 pl-3 pr-2 text-[13px] font-semibold text-[#0369a1] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                >
                  {catLabel(cat)}
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              {Object.entries(specs).map(([fid, vals]) => {
                const f = SPEC_FACETS.find((x) => x.id === fid);
                if (!f || vals.length === 0) return null;
                return (
                  <button
                    key={fid}
                    onClick={() => clearFacet(fid)}
                    className="group flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-1.5 pl-3 pr-2 text-[13px] font-semibold text-[#0369a1] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    {f.label[lang]}: {vals.length}
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                );
              })}
              {query.trim() && (
                <button
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                    touchedRef.current = true;
                  }}
                  className="group flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-1.5 pl-3 pr-2 text-[13px] font-semibold text-[#0369a1] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-sky-500/30 dark:bg-sky-500/10 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                >
                  «{query.trim()}»
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
              <button
                onClick={resetAll}
                className="ml-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-rose-600 hover:decoration-rose-300 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-rose-400 dark:hover:decoration-rose-500/50"
              >
                {UI.resetFilters[lang]}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Контент ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* Сайдбар шире (320px), чтобы «Категории» и «Производители» не сливались */}
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Сайдбар (десктоп): листается вместе со страницей — без sticky.
              Блоки категорий/производителей/характеристик уезжают вместе с контентом */}
          <aside className="hidden lg:block lg:self-start">{filterPanel}</aside>

          <div className="min-w-0">
            {/* Якорь прокрутки при смене страницы (с учётом липкой шапки) */}
            <div ref={gridTopRef} className="scroll-mt-24" aria-hidden />
            {/* Мобильная панель фильтров */}
            {mobileFilters && (
              <div className="mb-6 lg:hidden">
                {filterPanel}
              </div>
            )}

            {pageLoading ? (
              /* Плавный скелетон вместо списка на время смены страницы/фильтров */
              view === "grid" ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              )
            ) : shown.length > 0 ? (
              view === "grid" ? (
                <div
                  key={`g-${clampedPage}-${filtered.length}-${cat ?? ""}-${brand ?? ""}-${specCount}`}
                  className="grid animate-cards-in gap-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {shown.map((p, idx) => (
                    <ProductCard key={p.slug} p={p} eager={idx < 4} />
                  ))}
                </div>
              ) : (
                <div
                  key={`l-${clampedPage}-${filtered.length}-${cat ?? ""}-${brand ?? ""}-${specCount}`}
                  className="flex animate-cards-in flex-col gap-4"
                >
                  {shown.map((p, idx) => (
                    <ProductCard key={p.slug} p={p} layout="list" eager={idx < 3} />
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-[#f8fafc] p-12 text-center text-slate-500 dark:border-slate-700 dark:bg-white/[0.04] dark:text-slate-400">
                {tr({ ru: "Товары не найдены", uz: "Mahsulotlar topilmadi", en: "No products found" })}
              </div>
            )}

            {pages > 1 && (
              <div className="mt-9 flex items-center justify-center gap-1.5">
                <button
                  disabled={clampedPage === 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    bumpLoading(true);
                  }}
                  aria-label="Previous page"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors disabled:opacity-40 enabled:hover:border-[#0284c7] enabled:hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-400 dark:enabled:hover:border-[#38bdf8] dark:enabled:hover:text-[#38bdf8]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      if (n !== clampedPage) {
                        setPage(n);
                        bumpLoading(true);
                      }
                    }}
                    aria-current={n === clampedPage}
                    className={`h-10 min-w-10 rounded-xl px-2 text-sm font-semibold shadow-sm transition-colors ${
                      n === clampedPage
                        ? "bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white shadow-glow-sky-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-[#0284c7] hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-400 dark:hover:border-[#38bdf8] dark:hover:text-[#38bdf8]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={clampedPage === pages}
                  onClick={() => {
                    setPage((p) => Math.min(pages, p + 1));
                    bumpLoading(true);
                  }}
                  aria-label="Next page"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors disabled:opacity-40 enabled:hover:border-[#0284c7] enabled:hover:text-[#0284c7] dark:border-slate-800 dark:bg-[#101C2E] dark:text-slate-400 dark:enabled:hover:border-[#38bdf8] dark:enabled:hover:text-[#38bdf8]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
