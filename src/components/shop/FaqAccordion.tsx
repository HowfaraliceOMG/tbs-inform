"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/shop/content";
import { CONTACTS } from "@/lib/shop/data";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/** Частые вопросы — аккордеон на странице контактов */
export function FaqAccordion() {
  const { lang } = useShopLangT();
  const [open, setOpen] = useState<Set<number>>(new Set<number>());

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="eyebrow text-[#0284c7]">FAQ</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{UI.faqTitle[lang]}</h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          {UI.faqSub[lang]}{" "}
          <a href={CONTACTS.phoneHref} className="font-semibold text-[#0284c7] hover:underline">
            {CONTACTS.phone}
          </a>
        </p>
      </div>

      <div className="mt-7 grid gap-3 lg:grid-cols-2">
        {FAQ.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <div
              key={i}
              className={`self-start overflow-hidden rounded-2xl border bg-white transition-colors dark:bg-[#101C2E] ${
                isOpen ? "border-[#0284c7]/40 shadow-[0_10px_32px_-14px_rgba(2,132,199,0.35)] dark:border-[#38bdf8]/40" : "border-slate-200/80 dark:border-slate-800"
              }`}
            >
              <button
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{item.q[lang]}</span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                    isOpen ? "rotate-180 bg-[#0284c7] text-white" : "bg-sky-50 text-[#0284c7] dark:bg-sky-500/10"
                  }`}
                  aria-hidden
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
              {isOpen && (
                <p className="animate-promo px-5 pb-5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">{item.a[lang]}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
