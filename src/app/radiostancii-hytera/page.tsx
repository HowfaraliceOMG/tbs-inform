import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { CatalogView } from "@/components/shop/CatalogView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/radiostancii-hytera");

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Радиостанции", href: "/vse-radiostancii" }, { label: "Hytera" }]} />
      <CatalogView initialBrand="Hytera" titleKey="Hytera" title="Радиостанции Hytera" />
    </>
  );
}
