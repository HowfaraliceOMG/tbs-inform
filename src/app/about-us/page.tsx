import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { AboutView } from "@/components/shop/AboutView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/about-us");

export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "О компании" }]} />
      <AboutView />
    </>
  );
}
