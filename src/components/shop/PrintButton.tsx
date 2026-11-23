"use client";

import { Printer } from "lucide-react";

/**
 * Кнопка «Печать / PDF»: открывает системный диалог печати,
 * где «Сохранить как PDF» даёт файл без сторонних библиотек.
 * Сама кнопка при печати скрывается (print:hidden).
 */
export function PrintButton({
  label,
  variant = "primary",
  className = "",
}: {
  label: string;
  /** primary — синяя кнопка (прайс-лист); ghost — светлая, для строки действий карточки товара */
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const base =
    variant === "primary"
      ? "bg-[#0284c7] text-white shadow-[0_4px_14px_-4px_rgba(2,132,199,0.5)] hover:bg-[#0369a1]"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.1]";
  return (
    <button
      type="button"
      onClick={() => window.print()}
      title={label}
      className={`print:hidden inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${base} ${className}`}
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
