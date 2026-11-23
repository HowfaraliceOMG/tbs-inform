"use client";

/**
 * Счётчик посещаемости: отправляет просмотр страницы в /api/track (beacon).
 * Один запрос на смену маршрута; админ-панель не трекается.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function PageTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/sluzhebnoe")) return;
    if (last.current === pathname) return;
    last.current = pathname;

    try {
      let anon = localStorage.getItem("tbs-anon");
      if (!anon) {
        anon = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("tbs-anon", anon);
      }
      // Язык — как его видит сервер (cookie из ShopLangProvider), fallback —
      // localStorage для посетителей, чей выбор сделан до появления cookie
      const m = document.cookie.match(/(?:^|;\s*)tbs-lang=(ru|uz|en)/);
      const lang = m ? m[1] : localStorage.getItem("tbs-lang") || "ru";
      const device = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
      const ref =
        document.referrer && !document.referrer.startsWith(window.location.origin)
          ? new URL(document.referrer).hostname
          : "";
      const body = JSON.stringify({ path: pathname, lang, device, ref, anon });
      const url = "/api/track";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        void fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      }
    } catch {
      /* трекинг не критичен */
    }
  }, [pathname]);

  return null;
}
