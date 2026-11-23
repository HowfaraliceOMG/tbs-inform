import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { CatalogView } from "@/components/shop/CatalogView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/radiostancii-talkpod");

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Радиостанции", href: "/vse-radiostancii" }, { label: "Talkpod" }]} />
      <CatalogView initialBrand="Talkpod" titleKey="Talkpod" title="Радиостанции Talkpod" />
    </>
  );
}
