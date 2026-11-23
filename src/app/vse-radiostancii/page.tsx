import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { CatalogView } from "@/components/shop/CatalogView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/vse-radiostancii");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { cat, q } = await searchParams;
  return (
    <>
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Все радиостанции" }]} />
      <CatalogView key={`${cat ?? "all"}-${q ?? ""}`} initialCat={cat} initialQuery={q} titleKey="all" title="Все Радиостанции" />
    </>
  );
}
