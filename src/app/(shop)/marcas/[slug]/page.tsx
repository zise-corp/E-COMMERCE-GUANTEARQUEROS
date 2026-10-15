import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { getBrands } from "@/db/queries/catalog";
import { absoluteUrl, breadcrumbJsonLd, serializeJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

async function getBrand(slug: string) {
  const brands = await getBrands();
  return brands.find((brand) => brand.slug === slug);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return { title: "Marca no encontrada", robots: { index: false, follow: false } };
  const filtered = Object.keys(await searchParams).length > 0;
  const path = brand.slug === "drei" ? "/drei" : `/marcas/${brand.slug}`;
  const description = `Productos de ${brand.name} en Guante Arqueros Bolivia. Compra indumentaria deportiva con envíos a todo el país.`;
  return {
    title: `${brand.name} en Bolivia`,
    description,
    alternates: { canonical: path },
    robots: { index: !filtered, follow: true },
    openGraph: {
      type: "website",
      url: absoluteUrl(path),
      siteName: site.name,
      locale: "es_BO",
      title: `${brand.name} en Bolivia | ${site.shortName}`,
      description,
    },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (slug === "drei") permanentRedirect("/drei");
  const brand = await getBrand(slug);
  if (!brand) notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: serializeJsonLd(breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: brand.name, path: `/marcas/${brand.slug}` },
        ])),
      }} />
      <CategoryView
        searchParams={await searchParams}
        displayName={brand.name}
        fixedBrandName={brand.name}
        fixedBrandSlug={brand.slug}
      />
    </>
  );
}
