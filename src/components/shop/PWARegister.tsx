"use client";

import { useEffect } from "react";

/** Регистрация service worker (offline-режим PWA). Только прод: в dev SW
    мешает горячим перезагрузкам. */
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* регистрация не удалась — сайт работает и без SW */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
