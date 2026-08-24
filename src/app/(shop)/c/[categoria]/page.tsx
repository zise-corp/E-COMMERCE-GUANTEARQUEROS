import type { Metadata } from "next";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { getCategoryBySlug, getCategoryTree } from "@/db/queries/catalog";

export const revalidate = 300;

type Props = {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateStaticParams() {
  const tree = await getCategoryTree();
  return tree.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const category = await getCategoryBySlug(categoria);
  if (!category) return { title: "Categoría" };
  return {
    title: category.name,
    description: `${category.name} en Guantearqueros Bolivia. Envíos a todo el país, retiro en Cochabamba.`,
    alternates: { canonical: `/c/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  return <CategoryView categorySlug={categoria} searchParams={await searchParams} />;
}
