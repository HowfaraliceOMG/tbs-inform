import type { MetadataRoute } from "next";

/** Web App Manifest (PWA): сайт ставится на домашний экран телефона,
    работает в отдельном окне без адресной строки. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TBS Inform — профессиональная радиосвязь",
    short_name: "TBS Inform",
    description:
      "Портативные и мобильные радиостанции, ретрансляторы, аксессуары и сервисное обслуживание в Ташкенте.",
    lang: "ru",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0284c7",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
