import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Display } from "@/components/ui/Heading";
import {
  getCategoryFacets,
  getCategoryTree,
  getProductsByCategory,
  type CatalogFilters,
} from "@/db/queries/catalog";
import { CategoryFilters } from "./CategoryFilters";
import { ProductGrid } from "./ProductCard";

export type SearchParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function filtersFromParams(params: SearchParams): CatalogFilters {
  const hasta = Number.parseInt(
    Array.isArray(params["hasta"]) ? (params["hasta"][0] ?? "") : (params["hasta"] ?? ""),
    10,
  );
  return {
    brandNames: asArray(params["marca"]),
    sizes: asArray(params["talla"]),
    ...(Number.isFinite(hasta) ? { maxPrice: hasta } : {}),
  };
}

export async function CategoryView({
  categorySlug,
  subcategorySlug,
  searchParams,
  displayName,
  fixedBrandName,
}: {
  categorySlug: string;
  subcategorySlug?: string;
  searchParams: SearchParams;
  displayName?: string;
  fixedBrandName?: string;
}) {
  const target = subcategorySlug ?? categorySlug;
  const tree = await getCategoryTree();
  const root = tree.find((c) => c.slug === categorySlug);
  const category = subcategorySlug
    ? root?.children.find((child) => child.slug === target)
    : root;
  if (!category) notFound();

  const parent = subcategorySlug ? root : null;
  if (subcategorySlug && !parent) notFound();

  const resolvedCategory = {
    id: category.id,
    parentId: subcategorySlug ? (parent?.id ?? null) : null,
  };

  const filters = filtersFromParams(searchParams);
  if (fixedBrandName) filters.brandNames = [fixedBrandName];
  const [products, facets] = await Promise.all([
    getProductsByCategory(categorySlug, subcategorySlug, filters, resolvedCategory),
    getCategoryFacets(categorySlug, subcategorySlug, resolvedCategory),
  ]);

  const node = tree.find((c) => c.slug === categorySlug);
  const subcategories = node?.children ?? [];

  return (
    <section className="container-shop py-8 pb-[72px] sm:py-[34px]">
      <nav
        aria-label="Migas de pan"
        className="mb-3.5 text-xs uppercase tracking-[0.12em] text-content-dim"
      >
        <Link href="/" className="text-content-dim transition-colors duration-150 hover:text-brand">
          Inicio
        </Link>
        {" / "}
        {subcategorySlug && parent ? (
          <>
            <Link
              href={`/${parent.slug}`}
              className="text-content-dim transition-colors duration-150 hover:text-brand"
            >
              {parent.name}
            </Link>
            {" / "}
          </>
        ) : null}
        <span className="text-brand">{displayName ?? category.name}</span>
      </nav>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-[18px]">
        <Display as="h1" size="lg">
          {displayName ?? category.name}
        </Display>
        <p className="text-[12.5px] text-content-muted">
          {products.length} {products.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      {subcategories.length > 0 && !subcategorySlug && !fixedBrandName ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {subcategories.map((s) => (
            <Link
              key={s.id}
              href={`/${categorySlug}/${s.slug}`}
              className="border border-line-strong px-3 py-2 text-[11.5px] font-bold tracking-[0.06em] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
            >
              {s.name}
              <span className="ml-2 text-content-faint tabular">{s.productCount}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[258px_1fr]">
        <Suspense fallback={<div className="h-64 border border-line bg-ink-900" />}>
          <CategoryFilters
            brandNames={fixedBrandName ? [] : facets.brandNames}
            sizes={facets.sizes}
            maxPrice={facets.maxPrice}
          />
        </Suspense>

        <ProductGrid products={products} columns={3} aspect="4/3" />
      </div>
    </section>
  );
}
