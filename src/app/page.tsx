import type { Metadata } from "next";
import { HomePageClient } from "@/components/shop/HomePageClient";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/");

export default function Page() {
  return (
    <>
      {/* Единственный стабильный h1 главной: заголовки слайдов — h2 (HeroSlider) */}
      <h1 className="sr-only">Профессиональные радиостанции в Ташкенте — TBS Inform</h1>
      <HomePageClient />
    </>
  );
}
