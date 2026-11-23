"use client";

import Link from "next/link";
import { Home, Radio } from "lucide-react";
import { UI, useShopLangT } from "@/components/shop/shop-i18n-helpers";

export default function NotFound() {
  const { lang } = useShopLangT();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
      {/* Декор: точки + волны */}
      <div className="absolute inset-0 bg-dots-sky opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 280px at 50% 0%, rgb(14 165 233 / 0.1), transparent 65%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-28 lg:px-8">
        {/* 404 с иконкой рации */}
        <div className="relative">
          <p className="select-none text-[88px] font-extrabold leading-none tracking-tight text-transparent sm:text-[120px]" style={{ WebkitTextStroke: "2px #bae6fd" }} aria-hidden>
            404
          </p>
          <span className="absolute -right-5 -top-2 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-white text-[#0284c7] shadow-[0_18px_44px_-12px_rgba(2,132,199,0.45)] ring-1 ring-sky-100 sm:-right-10 sm:h-16 sm:w-16" aria-hidden>
            <Radio className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{UI.nfTitle[lang]}</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">{UI.nfText[lang]}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 px-7 py-3 text-[15px] font-bold text-white shadow-glow-sky transition-transform hover:scale-[1.03]"
          >
            <Home className="h-4.5 w-4.5" aria-hidden />
            {UI.nfHome[lang]}
          </Link>
          <Link
            href="/vse-radiostancii"
            className="flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-[15px] font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-[#0284c7] hover:text-white hover:ring-[#0284c7]"
          >
            {UI.nfCatalog[lang]}
          </Link>
        </div>
      </div>
    </div>
  );
}
