"use client";

import { useEffect, useState } from "react";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/**
 * Живой статус «Сейчас открыто» по графику Пн–Пт 09:00–18:00 (время Ташкента, UTC+5).
 * when: "now" — работаем; "today"/"tomorrow"/"monday" — когда откроемся.
 */
export type OpenWhen = "now" | "today" | "tomorrow" | "monday";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // 1 = Пн … 7 = Вс
const OPEN_MIN = 9 * 60;
const CLOSE_MIN = 18 * 60;

export function useOpenNow(): { open: boolean; when: OpenWhen } {
  const [status, setStatus] = useState<{ open: boolean; when: OpenWhen }>({ open: true, when: "now" });

  useEffect(() => {
    const check = () => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tashkent",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
      const d = WEEK.indexOf(get("weekday")) + 1;
      const mins = Number(get("hour")) * 60 + Number(get("minute"));
      if (d >= 1 && d <= 5 && mins >= OPEN_MIN && mins < CLOSE_MIN) setStatus({ open: true, when: "now" });
      else if (d >= 1 && d <= 5 && mins < OPEN_MIN) setStatus({ open: false, when: "today" });
      else if (d >= 1 && d <= 4) setStatus({ open: false, when: "tomorrow" }); // Пн–Чт вечером
      else setStatus({ open: false, when: "monday" }); // Пт после 18:00, Сб, Вс
    };
    check();
    const id = window.setInterval(check, 60000);
    return () => window.clearInterval(id);
  }, []);

  return status;
}

/** Пилюля со статусом — используется на странице «Контакты». */
export function OpenNowBadge() {
  const { lang } = useShopLangT();
  const openNow = useOpenNow();
  const when =
    openNow.when === "monday" ? UI.opensMonday[lang] : openNow.when === "tomorrow" ? UI.opensTomorrow[lang] : UI.opensToday[lang];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        openNow.open ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
      }`}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            openNow.open ? "bg-emerald-400" : "bg-red-400"
          }`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${openNow.open ? "bg-emerald-500" : "bg-red-500"}`} />
      </span>
      {openNow.open ? (
        <>
          {UI.openNow[lang]} · {UI.openUntil[lang]}
        </>
      ) : (
        <>
          {UI.closedNow[lang]} · {when}
        </>
      )}
    </span>
  );
}
