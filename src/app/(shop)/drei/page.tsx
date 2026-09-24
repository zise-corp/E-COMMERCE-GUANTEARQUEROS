import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { DreiIntro } from "@/components/shop/DreiIntro";
import { isDreiVisible } from "@/db/queries/catalog";
import { absoluteUrl, breadcrumbJsonLd, serializeJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: "DREI Athletic",
    description: "Camisetas, uniformes y calzas DREI Athletic para arqueros y equipos. Compra en Guante Arqueros Bolivia con envíos a todo el país.",
    keywords: ["DREI Athletic Bolivia", "indumentaria DREI", "camisetas de arquero DREI", "uniformes de fútbol DREI", "calzas deportivas DREI"],
    alternates: { canonical: "/drei" },
    robots: { index: !filtered, follow: true },
    openGraph: {
      type: "website",
      url: absoluteUrl("/drei"),
      siteName: site.name,
      locale: "es_BO",
      title: `DREI Athletic | ${site.shortName}`,
      description: "Indumentaria DREI Athletic para arqueros y equipos en Bolivia.",
    },
  };
}

export default async function DreiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await isDreiVisible())) notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: serializeJsonLd(breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "DREI Athletic", path: "/drei" },
        ])),
      }} />
      <DreiIntro />
      <CategoryView
        categorySlug="poleras"
        searchParams={await searchParams}
        displayName="DREI Athletic"
        fixedBrandName="DREI"
      />
    </>
  );
}
