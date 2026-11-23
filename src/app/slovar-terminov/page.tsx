import type { Metadata } from "next";
import { pageSeo } from "@/lib/shop/seo-pages";
import { GLOSSARY } from "@/lib/shop/glossary";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { GlossaryView } from "@/components/shop/GlossaryView";

export const metadata: Metadata = pageSeo("/slovar-terminov");

// JSON-LD: набор терминов (DefinedTermSet) — расширенный вид в поиске
const glossaryJsonLd = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Словарь терминов радиосвязи",
  description: "Основные термины профессиональной радиосвязи простыми словами: DMR, POC, NXDN, транкинг и другие.",
  hasDefinedTerm: GLOSSARY.map((t) => ({
    "@type": "DefinedTerm",
    name: t.term,
    alternateName: t.full,
    description: t.def.ru,
  })),
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryJsonLd) }} />
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Словарь терминов" }]} />
      <GlossaryView />
    </>
  );
}
