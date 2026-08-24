import { Suspense } from "react";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminTopbar } from "@/components/admin/AdminShell";
import { NewProductButton } from "@/components/admin/NewProductButton";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { listOrders } from "@/db/queries/orders";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Pedidos" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const all = await listOrders();

  const term = (q ?? "").trim().toLowerCase();
  const rows = term
    ? all.filter(
        (o) =>
          String(o.number).includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.replace(/\D/g, "").includes(term.replace(/\D/g, "")),
      )
    : all;

  return (
    <>
      <AdminTopbar
        title="Pedidos"
        subtitle={`${all.length} ${all.length === 1 ? "pedido" : "pedidos"} en total`}
        action={
          <>
            <Suspense fallback={null}>
              <AdminSearch placeholder="Buscar N°, cliente o teléfono…" />
            </Suspense>
            <NewProductButton />
          </>
        }
      />
      <div className="px-5 py-[26px] pb-16 sm:px-7">
        <OrdersManager
          rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      </div>
    </>
  );
}
