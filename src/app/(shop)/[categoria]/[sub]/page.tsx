import type { Metadata } from "next";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { getCategoryBySlug, getCategoryTree } from "@/db/queries/catalog";
import { absoluteUrl, breadcrumbJsonLd, categorySearchContent, serializeJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 300;

type Props = {
  params: Promise<{ categoria: string; sub: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateStaticParams() {
  const tree = await getCategoryTree();
  return tree.flatMap((category) =>
    category.children.map((subcategory) => ({
      categoria: category.slug,
      sub: subcategory.slug,
    })),
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categoria, sub } = await params;
  const [parent, category] = await Promise.all([getCategoryBySlug(categoria), getCategoryBySlug(sub)]);
  if (!parent || !category || category.parentId !== parent.id) return { title: "Subcategoría no encontrada", robots: { index: false, follow: false } };
  const { description, keywords } = categorySearchContent(category.name, category.slug, parent.name);
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: `${category.name} de ${parent.name} en Bolivia`,
    description,
    keywords,
    alternates: { canonical: `/${categoria}/${category.slug}` },
    robots: { index: !filtered, follow: true },
    openGraph: { type: "website", url: absoluteUrl(`/${categoria}/${category.slug}`), siteName: site.name, locale: "es_BO", title: `${category.name} de ${parent.name} | ${site.shortName}`, description },
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { categoria, sub } = await params;
  const [parent, category] = await Promise.all([getCategoryBySlug(categoria), getCategoryBySlug(sub)]);
  const breadcrumbs = parent && category && category.parentId === parent.id
    ? breadcrumbJsonLd([
        { name: "Inicio", path: "/" },
        { name: parent.name, path: `/${parent.slug}` },
        { name: category.name, path: `/${parent.slug}/${category.slug}` },
      ])
    : null;
  return (
    <>
      {breadcrumbs ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} /> : null}
      <CategoryView
        categorySlug={categoria}
        subcategorySlug={sub}
        searchParams={await searchParams}
      />
    </>
  );
}
