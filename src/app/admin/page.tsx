import { AdminTopbar } from "@/components/admin/AdminShell";
import {
  KpiTile,
  SalesChart,
  StatusBreakdown,
  TopProducts,
  type KpiTone,
} from "@/components/admin/DashboardCharts";
import { getDashboard } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { formatBs, formatBsCompact } from "@/lib/money";

export const metadata = { title: "Resumen" };

export default async function AdminDashboard() {
  await requireAdmin();
  const data = await getDashboard();

  const serieSemanal = data.weeklySales.map((w) => w.total);

  const kpis: {
    label: string;
    value: string;
    delta: string;
    tone: KpiTone;
    spark?: number[];
  }[] = [
    {
      label: "Ventas del mes",
      value: formatBsCompact(data.kpis.monthSales),
      delta:
        data.kpis.salesDelta === null
          ? "sin mes anterior para comparar"
          : `${data.kpis.salesDelta >= 0 ? "+" : ""}${data.kpis.salesDelta}% vs mes pasado`,
      tone: data.kpis.salesDelta === null ? "muted" : data.kpis.salesDelta >= 0 ? "ok" : "warn",
      spark: serieSemanal,
    },
    {
      label: "Pedidos pagados",
      value: String(data.kpis.monthOrders),
      delta: `${data.kpis.ordersLastWeek} en los últimos 7 días`,
      tone: "muted",
    },
    {
      label: "Ticket promedio",
      value: formatBs(data.kpis.averageTicket),
      delta: "sobre pedidos pagados del mes",
      tone: "muted",
    },
    {
      label: "Stock crítico",
      value: String(data.kpis.lowStock),
      delta:
        data.kpis.lowStock > 0
          ? "productos con 5 unidades o menos"
          : "ningún producto por reponer",
      tone: data.kpis.lowStock > 0 ? "alert" : "ok",
    },
  ];

  return (
    <>
      <AdminTopbar title="Resumen" subtitle="Mes en curso · últimas 12 semanas" />

      <div className="flex flex-col gap-4 px-5 py-[26px] pb-16 sm:px-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <KpiTile key={k.label} {...k} />
          ))}
        </div>

        <SalesChart data={data.weeklySales} />

        {/* Dos columnas parejas: antes eran 1.5fr/1fr con un solo hijo, así que
            "Más vendidos" ocupaba dos tercios y el resto quedaba vacío.
            minmax(0,1fr) y no 1fr: con el mínimo automático de grid, el nombre
            largo de un producto estira la columna más allá del contenedor. */}
        <div className="grid items-start gap-4 [grid-template-columns:minmax(0,1fr)] xl:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]">
          <TopProducts data={data.topProducts} />
          <StatusBreakdown data={data.byStatus} />
        </div>
      </div>
    </>
  );
}
