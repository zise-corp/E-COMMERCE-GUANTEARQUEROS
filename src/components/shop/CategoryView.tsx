import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Display } from "@/components/ui/Heading";
import {
  getCategoryBySlug,
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
}: {
  categorySlug: string;
  subcategorySlug?: string;
  searchParams: SearchParams;
}) {
  const target = subcategorySlug ?? categorySlug;
  const category = await getCategoryBySlug(target);
  if (!category) notFound();

  const parent = subcategorySlug ? await getCategoryBySlug(categorySlug) : null;
  if (subcategorySlug && (!parent || category.parentId !== parent.id)) notFound();

  const filters = filtersFromParams(searchParams);
  const [products, facets, tree] = await Promise.all([
    getProductsByCategory(categorySlug, subcategorySlug, filters),
    getCategoryFacets(categorySlug, subcategorySlug),
    getCategoryTree(),
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
              href={`/c/${parent.slug}`}
              className="text-content-dim transition-colors duration-150 hover:text-brand"
            >
              {parent.name}
            </Link>
            {" / "}
          </>
        ) : null}
        <span className="text-brand">{category.name}</span>
      </nav>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-[18px]">
        <Display as="h1" size="lg">
          {category.name}
        </Display>
        <p className="text-[12.5px] text-content-muted">
          {products.length} {products.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      {subcategories.length > 0 && !subcategorySlug ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {subcategories.map((s) => (
            <Link
              key={s.id}
              href={`/c/${categorySlug}/${s.slug}`}
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
            brandNames={facets.brandNames}
            sizes={facets.sizes}
            maxPrice={facets.maxPrice}
          />
        </Suspense>

        <ProductGrid products={products} columns={3} aspect="4/3" />
      </div>
    </section>
  );
}
