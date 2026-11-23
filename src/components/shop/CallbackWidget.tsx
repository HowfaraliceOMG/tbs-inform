"use client";

import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { UI, useShopLangT } from "./shop-i18n-helpers";
import { ShopLeadForm } from "./ShopLeadForm";

/** Плавающая кнопка «Заказать звонок» + модальное окно с формой */
export function CallbackWidget() {
  const { lang } = useShopLangT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={UI.callback[lang]}
        title={UI.callback[lang]}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-glow-sky transition-transform hover:scale-105"
      >
        <span className="absolute inset-0 animate-ping-ring rounded-full bg-sky-400" aria-hidden />
        <Phone className="relative h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={UI.callbackTitle[lang]}>
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-900/50 animate-in fade-in duration-200"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-[#0F1A2B]">
            <div className="eyebrow bg-[#0284c7] px-6 py-4 text-white">{UI.callbackTitle[lang]}</div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex items-center gap-3 px-6 pt-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f8fafc] text-[#0284c7] dark:bg-sky-500/10">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">TBS Inform</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">+998 71 237-00-86</p>
              </div>
            </div>
            <div className="px-6 pb-6">
              <ShopLeadForm product="Обратный звонок" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
