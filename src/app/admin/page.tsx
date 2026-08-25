import { AdminTopbar } from "@/components/admin/AdminShell";
import { getDashboard } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { cn } from "@/lib/cn";
import { formatBs, formatBsCompact } from "@/lib/money";

export const metadata = { title: "Resumen" };

const STATUS_META: Record<string, { label: string; color: string }> = {
  recibido: { label: "Recibido", color: "#FA2A00" },
  en_proceso: { label: "En proceso", color: "#E2B93B" },
  completado: { label: "Completado", color: "#6FCF8E" },
  cancelado: { label: "Cancelado", color: "#8A8783" },
};

export default async function AdminDashboard() {
  await requireAdmin();
  const data = await getDashboard();

  const maxSale = Math.max(1, ...data.weeklySales.map((w) => w.total));
  const totalOrders = data.byStatus.reduce((n, s) => n + s.n, 0);
  const maxUnits = Math.max(1, ...data.topProducts.map((t) => t.units));

  const kpis = [
    {
      label: "Ventas del mes",
      value: formatBsCompact(data.kpis.monthSales),
      delta:
        data.kpis.salesDelta === null
          ? "sin mes anterior"
          : `${data.kpis.salesDelta >= 0 ? "+" : ""}${data.kpis.salesDelta}% vs mes pasado`,
      tone: data.kpis.salesDelta === null ? "muted" : data.kpis.salesDelta >= 0 ? "ok" : "warn",
    },
    {
      label: "Pedidos",
      value: String(data.kpis.monthOrders),
      delta: `+${data.kpis.ordersLastWeek} esta semana`,
      tone: "ok",
    },
    {
      label: "Ticket promedio",
      value: formatBs(data.kpis.averageTicket),
      delta: "sobre pedidos pagados",
      tone: "muted",
    },
    {
      label: "Stock crítico",
      value: String(data.kpis.lowStock),
      delta: "productos con 5 u. o menos",
      tone: data.kpis.lowStock > 0 ? "alert" : "muted",
    },
  ] as const;

  const toneClass = {
    ok: "text-state-ok",
    warn: "text-state-warn",
    alert: "text-alert-soft",
    muted: "text-content-dim",
  } as const;

  return (
    <>
      <AdminTopbar title="Resumen" subtitle="Últimos 30 días" />

      <div className="flex flex-col gap-[18px] px-5 py-[26px] pb-16 sm:px-7">
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="border border-ink-700 bg-ink-850 p-[18px]">
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-content-dim">{k.label}</p>
              <p className="mt-2 font-display text-[34px] leading-none text-content tabular">
                {k.value}
              </p>
              <p className={cn("mt-1 text-[11.5px]", toneClass[k.tone])}>{k.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3.5 xl:grid-cols-[1.5fr_1fr]">
          <div className="border border-ink-700 bg-ink-850 p-5">
            <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
                Ventas por semana
              </h2>
              <p className="text-[11.5px] text-content-dim">Últimas 12 semanas · Bs</p>
            </div>
            <div className="flex h-[190px] items-end gap-2">
              {data.weeklySales.map((w, i) => (
                <div
                  key={w.label}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-[7px]"
                >
                  <div
                    className={cn(
                      "w-full origin-bottom animate-grow-y",
                      i === data.weeklySales.length - 1 ? "bg-brand" : "bg-[#3A3A38]",
                    )}
                    style={{ height: `${Math.max(2, (w.total / maxSale) * 100)}%` }}
                    title={`${w.label}: ${formatBs(w.total)}`}
                  />
                  <span className="text-[10px] text-content-faint">{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-ink-700 bg-ink-850 p-5">
            <h2 className="mb-4 text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
              Pedidos por estado
            </h2>

            {totalOrders === 0 ? (
              <p className="py-8 text-center text-[13px] text-content-dim">Todavía no hay pedidos.</p>
            ) : (
              <>
                <div className="mb-[18px] flex h-3 overflow-hidden">
                  {data.byStatus.map((s) => (
                    <div
                      key={s.status}
                      style={{
                        width: `${(s.n / totalOrders) * 100}%`,
                        background: STATUS_META[s.status]?.color ?? "#3A3A38",
                      }}
                    />
                  ))}
                </div>
                <ul>
                  {data.byStatus.map((s) => (
                    <li
                      key={s.status}
                      className="flex items-center gap-2.5 border-b border-line-soft py-[9px]"
                    >
                      <span
                        className="block h-[9px] w-[9px]"
                        style={{ background: STATUS_META[s.status]?.color ?? "#3A3A38" }}
                        aria-hidden
                      />
                      <span className="flex-1 text-[13px]">
                        {STATUS_META[s.status]?.label ?? s.status}
                      </span>
                      <span className="text-[13px] font-extrabold tabular">{s.n}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3.5 xl:grid-cols-[1.5fr_1fr]">
          <div className="border border-ink-700 bg-ink-850">
            <h2 className="border-b border-ink-700 px-5 py-4 text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
              Más vendidos
            </h2>
            {data.topProducts.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-content-dim">
                Todavía no hay ventas confirmadas.
              </p>
            ) : (
              <ul>
                {data.topProducts.map((t, i) => (
                  <li
                    key={t.name}
                    className="grid grid-cols-[26px_1fr_90px] items-center gap-3.5 border-b border-line-soft px-5 py-3 sm:grid-cols-[26px_1fr_120px_90px]"
                  >
                    <span className="font-display text-base text-[#3A3A38]">{i + 1}</span>
                    <span className="truncate text-[13.5px] font-semibold">{t.name}</span>
                    <div className="hidden h-1.5 bg-line-soft sm:block">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${(t.units / maxUnits) * 100}%` }}
                      />
                    </div>
                    <span className="text-right text-[13px] text-content-muted tabular">
                      {t.units} u.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
