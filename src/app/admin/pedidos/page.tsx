import { Suspense } from "react";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminTopbar } from "@/components/admin/AdminShell";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { OrdersCalendar } from "@/components/admin/OrdersCalendar";
import { listOrders, salesForDate } from "@/db/queries/orders";
import { formatBs } from "@/lib/money";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Pedidos" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string }>;
}) {
  await requireAdmin();
  const { q, date } = await searchParams;
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  const [all, dailySales] = await Promise.all([
    listOrders(undefined, selectedDate),
    selectedDate ? salesForDate(selectedDate) : Promise.resolve([]),
  ]);

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
        subtitle={`${all.length} ${all.length === 1 ? "pedido" : "pedidos"}${selectedDate ? " en la fecha seleccionada" : " en total"}`}
        action={
          <Suspense fallback={null}>
            <AdminSearch placeholder="Buscar N°, cliente o teléfono…" />
          </Suspense>
        }
      />
      <div className="px-5 py-[26px] pb-16 sm:px-7">
        <Suspense fallback={<div className="mb-5 h-[90px] border border-ink-700 bg-ink-850" />}>
          <OrdersCalendar selectedDate={selectedDate} />
        </Suspense>

        {selectedDate ? (
          <section className="mb-5 border border-ink-700 bg-ink-850">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 px-5 py-3.5">
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.09em]">Productos vendidos ese día</h2>
              <span className="text-[11px] uppercase tracking-[0.1em] text-content-dim">Solo pagos confirmados</span>
            </div>
            {dailySales.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-content-dim">No existen ventas pagadas en esta fecha.</p>
            ) : (
              <div className="grid gap-px bg-line-soft sm:grid-cols-2 xl:grid-cols-3">
                {dailySales.map((sale) => (
                  <div key={`${sale.name}-${sale.size ?? "u"}`} className="flex items-center gap-3 bg-ink-850 px-5 py-3.5">
                    <span className="flex h-9 min-w-9 items-center justify-center bg-brand font-display text-lg text-ink-950 tabular">{sale.units}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{sale.name}</span>
                      <span className="text-[11px] text-content-dim">{sale.size ? `Talla ${sale.size}` : "Sin talla"}</span>
                    </span>
                    <span className="text-[12.5px] font-extrabold tabular">{formatBs(sale.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <OrdersManager
          rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      </div>
    </>
  );
}
