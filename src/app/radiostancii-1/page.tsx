import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { CatalogView } from "@/components/shop/CatalogView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/radiostancii-1");

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Все радиостанции" }]} />
      <CatalogView titleKey="all" title="Все Радиостанции" />
    </>
  );
}
