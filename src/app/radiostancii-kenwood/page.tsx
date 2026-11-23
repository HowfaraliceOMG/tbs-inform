import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { CatalogView } from "@/components/shop/CatalogView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/radiostancii-kenwood");

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Радиостанции", href: "/vse-radiostancii" }, { label: "Kenwood" }]} />
      <CatalogView initialBrand="Kenwood" titleKey="Kenwood" title="Радиостанции Kenwood" />
    </>
  );
}
