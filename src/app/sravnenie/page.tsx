import type { Metadata } from "next";
import { CompareView } from "@/components/shop/CompareView";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/sravnenie");

export default function Page() {
  return <CompareView />;
}
