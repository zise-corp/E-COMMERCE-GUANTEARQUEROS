import { ProductsManager } from "@/components/admin/ProductsManager";
import { getAdminProducts, getBrandOptions, getCategoryOptions } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Productos" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; q?: string }>;
}) {
  await requireAdmin();
  const { nuevo, q } = await searchParams;

  const [allRows, options, brands] = await Promise.all([
    getAdminProducts(),
    getCategoryOptions(),
    getBrandOptions(),
  ]);

  const term = (q ?? "").trim().toLowerCase();
  const rows = term
    ? allRows.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          (r.brandName ?? "").toLowerCase().includes(term) ||
          `gq-${String(r.id).padStart(4, "0")}`.includes(term),
      )
    : allRows;

  const categories = [...options.roots, ...options.subs];

  return (
    <ProductsManager
      rows={rows}
      totalCount={allRows.length}
      categories={categories}
      brands={brands}
      openNew={nuevo === "1"}
    />
  );
}
