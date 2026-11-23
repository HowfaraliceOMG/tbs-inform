"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneCall, Send, X } from "lucide-react";
import { CONTACTS } from "@/lib/shop/data";
import type { L } from "@/lib/shop/data";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/**
 * Веер связи: одна плавающая кнопка раскрывается в список каналов —
 * прямой звонок и Telegram. «Заказать звонок» и WhatsApp убраны из веера:
 * форма звонка живёт на страницах и в мобильной таб-панели.
 */

interface FanItem {
  id: string;
  label: L;
  href: string;
  bg: string;
}

export function MessengerFan() {
  const { lang } = useShopLangT();
  const [open, setOpen] = useState(false);

  // Открытый веер: блокируем скролл фона, Escape закрывает
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

  const items: FanItem[] = [
    { id: "call", label: { ru: "Позвонить", uz: "Qo'ng'iroq qilish", en: "Call now" }, href: CONTACTS.phoneHref, bg: "bg-[#075985] text-white" },
    { id: "telegram", label: { ru: "Telegram", uz: "Telegram", en: "Telegram" }, href: CONTACTS.telegram, bg: "bg-[#229ed9] text-white" },
  ];

  return (
    <>
      {/* Затемнение при открытом веере — закрывает по клику */}
      {open && (
        <button aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-slate-900/20 animate-in fade-in duration-200" />
      )}

      {/* На мобильных (< lg) веер скрыт: там нижняя таб-панель с поиском,
          контактами и формой звонка на страницах — дублирование только мешает */}
      <div className="fixed bottom-5 right-5 z-50 hidden flex-col items-end gap-3 lg:flex">
        {/* Пункты веера */}
        {open && (
          <div className="flex flex-col items-end gap-3" role="group" aria-label={UI.contacts[lang]}>
            {items.map((it, i) => (
              <a
                key={it.id}
                href={it.href}
                target={it.href.startsWith("http") ? "_blank" : undefined}
                rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={it.label[lang]}
                className="group flex cursor-pointer items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
                style={{ animationDelay: `${(items.length - 1 - i) * 45}ms`, animationFillMode: "backwards" }}
              >
                <span className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700 shadow-md ring-1 ring-slate-100 dark:bg-[#0F1A2B] dark:text-slate-200 dark:ring-slate-700">
                  {it.label[lang]}
                </span>
                <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${it.bg}`}>
                  {it.id === "call" && <PhoneCall className="h-5 w-5" />}
                  {it.id === "telegram" && <Send className="h-5 w-5" />}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Главная кнопка */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close" : UI.contacts[lang]}
          title={UI.contacts[lang]}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-glow-sky transition-transform duration-300 hover:scale-105"
        >
          {!open && <span className="absolute inset-0 animate-ping-ring rounded-full bg-sky-400" aria-hidden />}
          <span className={`relative transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
            {open ? <X className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </span>
        </button>
      </div>
    </>
  );
}
