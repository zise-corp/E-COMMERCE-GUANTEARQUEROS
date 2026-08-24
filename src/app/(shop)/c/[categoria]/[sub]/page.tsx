import type { Metadata } from "next";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { getCategoryBySlug, getCategoryTree } from "@/db/queries/catalog";

export const revalidate = 300;

type Props = {
  params: Promise<{ categoria: string; sub: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateStaticParams() {
  const tree = await getCategoryTree();
  return tree.flatMap((c) => c.children.map((s) => ({ categoria: c.slug, sub: s.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria, sub } = await params;
  const category = await getCategoryBySlug(sub);
  if (!category) return { title: "Subcategoría" };
  return {
    title: category.name,
    description: `${category.name} en Guantearqueros Bolivia.`,
    alternates: { canonical: `/c/${categoria}/${category.slug}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { categoria, sub } = await params;
  return (
    <CategoryView
      categorySlug={categoria}
      subcategorySlug={sub}
      searchParams={await searchParams}
    />
  );
}
