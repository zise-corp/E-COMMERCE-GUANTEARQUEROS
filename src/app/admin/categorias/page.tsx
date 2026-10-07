import Link from "next/link";
import { Suspense } from "react";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminTopbar } from "@/components/admin/AdminShell";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { getAdminCategories } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Categorías" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; vista?: string; q?: string }>;
}) {
  await requireAdmin();
  const { nuevo, vista, q } = await searchParams;
  const activeView = vista === "subcategorias" ? "subcategorias" : "principales";
  const rows = await getAdminCategories();
  const subCount = rows.reduce((n, r) => n + r.subs.length, 0);
  const term = (q ?? "").trim();

  return (
    <>
      <AdminTopbar
        title="Categorías"
        subtitle={`${rows.length} categorías · ${subCount} subcategorías`}
        action={
          <>
            <Suspense fallback={null}>
              <AdminSearch
                placeholder={activeView === "subcategorias" ? "Buscar subcategoría…" : "Buscar categoría…"}
              />
            </Suspense>
            {activeView === "principales" ? (
              <Link href="/admin/categorias?vista=principales&nuevo=categoria" className="whitespace-nowrap bg-brand px-4 py-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:bg-brand-hot">+ Nueva categoría</Link>
            ) : (
              <Link href="/admin/categorias?vista=subcategorias&nuevo=subcategoria" className="whitespace-nowrap bg-brand px-4 py-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:bg-brand-hot">+ Nueva subcategoría</Link>
            )}
          </>
        }
      />
      <div className="px-5 py-[26px] pb-16 sm:px-7">
        <CategoriesManager
          rows={rows}
          initialView={activeView}
          openNew={nuevo === "categoria" ? "principal" : nuevo === "subcategoria" ? "subcategoria" : null}
          searchTerm={term}
        />
      </div>
    </>
  );
}
