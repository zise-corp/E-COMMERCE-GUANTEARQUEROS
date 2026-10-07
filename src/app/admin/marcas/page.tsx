import Link from "next/link";
import { Suspense } from "react";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminTopbar } from "@/components/admin/AdminShell";
import { BrandsManager } from "@/components/admin/BrandsManager";
import { getAdminBrands } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Marcas" };

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; q?: string }>;
}) {
  await requireAdmin();
  const { nuevo, q } = await searchParams;
  const allRows = await getAdminBrands();

  // DREI es la marca propia: siempre arriba, sin importar su `position` en DB
  // ni el orden alfabético que podría colarla entre marcas externas. Si la DB
  // ya la trae primera (lo normal, reorderBrandsAction la fuerza a position 0),
  // este reordenamiento es idempotente.
  const sortedRows = [
    ...allRows.filter((row) => row.slug === "drei"),
    ...allRows.filter((row) => row.slug !== "drei"),
  ];

  const term = (q ?? "").trim().toLowerCase();
  const rows = term
    ? sortedRows.filter((row) => row.name.toLowerCase().includes(term))
    : sortedRows;

  return (
    <>
      <AdminTopbar
        title="Marcas"
        subtitle={`${allRows.length} ${allRows.length === 1 ? "marca" : "marcas"}`}
        action={
          <>
            <Suspense fallback={null}>
              <AdminSearch placeholder="Buscar marca…" />
            </Suspense>
            <Link
              href="/admin/marcas?nuevo=1"
              className="whitespace-nowrap bg-brand px-4 py-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot"
            >
              + Nueva marca
            </Link>
          </>
        }
      />
      <div className="px-5 py-[26px] pb-16 sm:px-7">
        <BrandsManager rows={rows} openNew={nuevo === "1"} searchTerm={term} totalCount={allRows.length} />
      </div>
    </>
  );
}
