"use client";

import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { CONTACTS } from "@/lib/shop/data";
import { CONTACT_INTRO } from "@/lib/shop/content";
import { ShopLeadForm } from "./ShopLeadForm";
import { OpenNowBadge } from "./OpenNowBadge";
import { LazyMap } from "./LazyMap";
import { Reveal } from "./Reveal";
import { UI, useShopLangT } from "./shop-i18n-helpers";

export function ContactView() {
  const { lang, tr } = useShopLangT();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow text-[#0284c7]">TBS INFORM • {tr({ ru: "СВЯЗЬ", uz: "ALOQA", en: "CONTACT" })}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        {tr({ ru: "Контакты", uz: "Aloqa", en: "Contacts" })}
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{CONTACT_INTRO[lang]}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Информация */}
        <Reveal className="space-y-4">
          <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0284c7]/40 hover:shadow-[0_14px_36px_-12px_rgba(2,132,199,0.28)] dark:border-slate-800 dark:bg-[#101C2E] dark:hover:border-[#38bdf8]/40">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/15">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {tr({ ru: "Адрес", uz: "Manzil", en: "Address" })}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">{CONTACTS.address[lang]}</p>
            </div>
          </div>
          <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0284c7]/40 hover:shadow-[0_14px_36px_-12px_rgba(2,132,199,0.28)] dark:border-slate-800 dark:bg-[#101C2E] dark:hover:border-[#38bdf8]/40">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/15">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {tr({ ru: "Телефон", uz: "Telefon", en: "Phone" })}
              </p>
              <a href={CONTACTS.phoneHref} className="mt-0.5 block text-[15px] font-semibold text-slate-900 hover:text-[#0369a1] dark:text-white">
                {CONTACTS.phone}
              </a>
            </div>
          </div>
          <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0284c7]/40 hover:shadow-[0_14px_36px_-12px_rgba(2,132,199,0.28)] dark:border-slate-800 dark:bg-[#101C2E] dark:hover:border-[#38bdf8]/40">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/15">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">E-mail</p>
              <a href={`mailto:${CONTACTS.email}`} className="mt-0.5 block text-[15px] font-semibold text-slate-900 hover:text-[#0369a1] dark:text-white">
                {CONTACTS.email}
              </a>
            </div>
          </div>
          <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0284c7]/40 hover:shadow-[0_14px_36px_-12px_rgba(2,132,199,0.28)] dark:border-slate-800 dark:bg-[#101C2E] dark:hover:border-[#38bdf8]/40">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0284c7] transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/15">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {tr({ ru: "Время работы", uz: "Ish vaqti", en: "Working hours" })}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-slate-900 dark:text-white">{CONTACTS.hours[lang]}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                <OpenNowBadge />
              </p>
            </div>
          </div>
          <a
            href={CONTACTS.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl bg-[#0284c7] px-5 py-4 text-white shadow-[0_8px_24px_-8px_rgba(2,132,199,0.55)] transition-transform hover:scale-[1.01]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Send className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white/80">Telegram</p>
              <p className="mt-0.5 text-[15px] font-bold">@TBS_inform_bot</p>
            </div>
          </a>
        </Reveal>

        {/* Форма + карта */}
        <Reveal delay={90} className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#101C2E]">
            <h2 className="mb-4 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              {tr({ ru: "Оставить заявку", uz: "Ariza qoldirish", en: "Leave a request" })}
            </h2>
            <ShopLeadForm />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Карта по клику — грузится только по нажатию (см. LazyMap) */}
            <LazyMap
              src="https://yandex.ru/map-widget/v1/?ll=69.279762%2C41.311171&text=%D0%A2%D0%B0%D1%88%D0%BA%D0%B5%D0%BD%D1%82%2C%20%D0%BF%D0%BB%D0%BE%D1%89%D0%B0%D0%B4%D1%8C%20%D0%A5%D0%B0%D0%BC%D0%B8%D0%B4%D0%B0%20%D0%90%D0%BB%D0%B8%D0%BC%D0%B6%D0%B0%D0%BD%D0%B0%2C%2013%D0%91&z=16"
              className="h-64 w-full border-0"
            />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
