"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { PRODUCTS } from "@/lib/shop/data";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/** Живой поиск: тёмная панель под шапкой с мгновенными подсказками */
export function LiveSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useShopLangT();
  const [q, setQ] = useState("");
  const lastLogged = useRef<string>("");

  // Лог поисковых запросов для админ-панели («Обзор» → поисковые запросы):
  // beacon через 700 мс после остановки ввода, запрос ≥ 2 символов
  useEffect(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2 || s === lastLogged.current) return;
    const id = window.setTimeout(() => {
      lastLogged.current = s;
      try {
        const anon = localStorage.getItem("tbs-anon") || "";
        const lg = localStorage.getItem("tbs-lang") || "ru";
        const body = JSON.stringify({ query: s, lang: lg, anon });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
        } else {
          void fetch("/api/track", {
            method: "POST",
            body,
            keepalive: true,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        /* трекинг не критичен */
      }
    }, 700);
    return () => window.clearTimeout(id);
  }, [q]);

  const { shown, total } = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return { shown: [], total: 0 };
    const all = PRODUCTS.filter((p) => `${p.name} ${p.brand} ${p.short}`.toLowerCase().includes(s));
    return { shown: all.slice(0, 6), total: all.length };
  }, [q]);

  if (!open) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101C2E]">
      <div className="mx-auto max-w-3xl px-4 py-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder={UI.searchHint[lang]}
            aria-label={UI.searchTitle[lang]}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/30 dark:border-slate-700 dark:bg-[#0F1A2B] dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {q.trim().length >= 2 && (
          <div className="mt-3">
            {shown.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{UI.nothingFound[lang]}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {shown.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/product/${p.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    >
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white p-1 dark:bg-white">
                        <Image
                          src={p.img}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{p.name}</span>
                        <span className="block text-xs uppercase tracking-wide text-[#0284c7]">{p.brand}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {total > shown.length && (
              <Link
                href={`/vse-radiostancii?q=${encodeURIComponent(q.trim())}`}
                onClick={onClose}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#0284c7]/15 py-2.5 text-sm font-semibold text-[#0284c7] transition-colors hover:bg-[#0284c7]/25"
              >
                {UI.seeAllResults[lang]} ({total})
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
