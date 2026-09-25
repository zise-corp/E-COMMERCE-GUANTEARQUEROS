import type { Metadata } from "next";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { getCategoryBySlug } from "@/db/queries/catalog";
import { absoluteUrl, breadcrumbJsonLd, categorySearchContent, serializeJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

// Los filtros dependen de searchParams; estas páginas se renderizan por solicitud.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const category = await getCategoryBySlug(categoria);
  if (!category || category.parentId !== null) return { title: "Categoría no encontrada", robots: { index: false, follow: false } };
  const { description, keywords } = categorySearchContent(category.name, category.slug);
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: `${category.name} en Bolivia`,
    description,
    keywords,
    alternates: { canonical: `/${category.slug}` },
    robots: { index: !filtered, follow: true },
    openGraph: { type: "website", url: absoluteUrl(`/${category.slug}`), siteName: site.name, locale: "es_BO", title: `${category.name} en Bolivia | ${site.shortName}`, description },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  const category = await getCategoryBySlug(categoria);
  const breadcrumbs = category && category.parentId === null
    ? breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: category.name, path: `/${category.slug}` }])
    : null;
  return <>
    {breadcrumbs ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} /> : null}
    <CategoryView categorySlug={categoria} searchParams={await searchParams} />
  </>;
}
