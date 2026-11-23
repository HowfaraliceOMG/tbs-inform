import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { ContactView } from "@/components/shop/ContactView";
import { FaqAccordion } from "@/components/shop/FaqAccordion";
import { FAQ } from "@/lib/shop/content";
import { pageSeo } from "@/lib/shop/seo-pages";

export const metadata: Metadata = pageSeo("/contact");

// JSON-LD FAQPage для поисковиков
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q.ru,
    acceptedAnswer: { "@type": "Answer", text: f.a.ru },
  })),
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Контакты" }]} />
      <ContactView />
      <FaqAccordion />
    </>
  );
}
