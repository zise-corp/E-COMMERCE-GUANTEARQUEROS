import { AdminTopbar } from "@/components/admin/AdminShell";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { getAdminCategories } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const rows = await getAdminCategories();
  const subCount = rows.reduce((n, r) => n + r.subs.length, 0);

  return (
    <>
      <AdminTopbar
        title="Categorías"
        subtitle={`${rows.length} categorías · ${subCount} subcategorías`}
      />
      <div className="px-5 py-[26px] pb-16 sm:px-7">
        <CategoriesManager rows={rows} />
      </div>
    </>
  );
}
