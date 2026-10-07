import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Display } from "@/components/ui/Heading";
import {
  getBrandFacets,
  getCategoryFacets,
  getCategoryTree,
  getProductsByBrand,
  getProductsByCategory,
  type CatalogFilters,
} from "@/db/queries/catalog";
import { categorySearchContent } from "@/lib/seo";
import { CategoryFilters } from "./CategoryFilters";
import { PaginatedProductGrid } from "./PaginatedProductGrid";

export type SearchParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

export function filtersFromParams(params: SearchParams): CatalogFilters {
  const rawPrice = Array.isArray(params["hasta"]) ? (params["hasta"][0] ?? "") : (params["hasta"] ?? "");
  const hasta = /^\d+$/.test(rawPrice) ? Number(rawPrice) : Number.NaN;
  return {
    brandNames: asArray(params["marca"]),
    sizes: asArray(params["talla"]),
    ...(Number.isSafeInteger(hasta) && hasta >= 0 ? { maxPrice: hasta } : {}),
  };
}

export async function CategoryView({
  categorySlug,
  subcategorySlug,
  searchParams,
  displayName,
  fixedBrandName,
  fixedBrandSlug,
}: {
  categorySlug?: string;
  subcategorySlug?: string;
  searchParams: SearchParams;
  displayName?: string;
  fixedBrandName?: string;
  fixedBrandSlug?: string;
}) {
  const isBrandView = Boolean(fixedBrandName && fixedBrandSlug);
  if (!categorySlug && !isBrandView) notFound();

  const tree = categorySlug ? await getCategoryTree() : [];
  const target = subcategorySlug ?? categorySlug;
  const root = categorySlug ? tree.find((c) => c.slug === categorySlug) : undefined;
  const category = subcategorySlug
    ? root?.children.find((child) => child.slug === target)
    : root;
  if (!isBrandView && !category) notFound();

  const parent = subcategorySlug ? root : null;
  if (subcategorySlug && !parent) notFound();
  const categoryIntro = fixedBrandName
    ? "Camisetas, uniformes y calzas DREI Athletic para arqueros y equipos de fútbol en Bolivia."
    : category
      ? categorySearchContent(category.name, category.slug, parent?.name).intro
      : "";
  const resolvedDisplayName = displayName ?? category?.name ?? fixedBrandName ?? "Catálogo";

  const resolvedCategory = category
    ? {
        id: category.id,
        parentId: subcategorySlug ? (parent?.id ?? null) : null,
      }
    : undefined;

  const filters = filtersFromParams(searchParams);
  const [products, facets] = fixedBrandSlug
    ? await Promise.all([
        getProductsByBrand(fixedBrandSlug, filters),
        getBrandFacets(fixedBrandSlug),
      ])
    : await Promise.all([
        getProductsByCategory(categorySlug!, subcategorySlug, filters, resolvedCategory),
        getCategoryFacets(categorySlug!, subcategorySlug, resolvedCategory),
      ]);

  const node = categorySlug ? tree.find((c) => c.slug === categorySlug) : undefined;
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
        {categorySlug && subcategorySlug && parent ? (
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
        <span className="text-brand">{resolvedDisplayName}</span>
      </nav>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-[18px]">
        <Display as="h1" size="lg">
          {resolvedDisplayName}
        </Display>
        <p className="text-[12.5px] text-content-muted">
          {products.length} {products.length === 1 ? "resultado" : "resultados"}
        </p>
      </div>

      <p className="mb-6 max-w-[760px] text-sm leading-relaxed text-content-muted">
        {categoryIntro}
      </p>

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

        <PaginatedProductGrid products={products} />
      </div>
    </section>
  );
}
