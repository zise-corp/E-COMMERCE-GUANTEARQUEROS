import { Suspense } from "react";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminTopbar } from "@/components/admin/AdminShell";
import { NewProductButton } from "@/components/admin/NewProductButton";
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
    <>
      <AdminTopbar
        title="Productos"
        subtitle={`${allRows.length} ${allRows.length === 1 ? "producto" : "productos"} en catálogo`}
        action={
          <>
            <Suspense fallback={null}>
              <AdminSearch placeholder="Buscar producto o SKU…" />
            </Suspense>
            <NewProductButton />
          </>
        }
      />
      <div className="px-5 py-[26px] pb-16 sm:px-7">
        <ProductsManager
          rows={rows}
          categories={categories}
          brands={brands}
          openNew={nuevo === "1"}
        />
      </div>
    </>
  );
}
