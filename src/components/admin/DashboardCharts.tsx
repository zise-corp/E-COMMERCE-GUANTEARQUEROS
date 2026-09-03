import { cn } from "@/lib/cn";
import { formatBs, formatBsCompact } from "@/lib/money";
import { ORDER_STATUS_META, ORDER_STATUS_ORDER } from "@/lib/order-status";

/* ── Utilidades de escala ─────────────────────────────────────────────────── */

/** Escalones "limpios" para el eje. La escalera es fina a propósito: con solo
 *  1/2/5/10 el techo se va muy por encima del pico y las barras quedan
 *  aplastadas contra el piso (un máximo de 2.640 saltaba a 5.000). */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = NICE_STEPS.find((s) => normalized <= s + 1e-9) ?? 10;
  return step * magnitude;
}

/**
 * Techo del eje y paso entre marcas. Se calcula desde el paso (pico / 4) y no
 * desde el techo, para que las cuatro marcas caigan en números redondos: si se
 * redondea el techo, los cuartos salen 3.750 y 1.250.
 */
function escala(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 };
  const step = niceCeil(max / 4);
  return { top: step * 4, step };
}

function weekLabel(iso: string): string {
  // El ISO viene como YYYY-MM-DD; se parte a mano para no depender de la zona
  // horaria del server (new Date("2026-01-05") se interpreta como UTC y en
  // Bolivia retrocede un día).
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString("es-BO", { day: "numeric", month: "short" });
}

/* ── Ventas por semana ────────────────────────────────────────────────────── */

const GRID_STEPS = [1, 0.75, 0.5, 0.25, 0];

export function SalesChart({ data }: { data: { weekStart: string; total: number }[] }) {
  const { top: max } = escala(Math.max(...data.map((w) => w.total), 0));
  const conVentas = data.filter((w) => w.total > 0).length;
  const total = data.reduce((acc, w) => acc + w.total, 0);
  const ultimo = data.length - 1;
  const mejor = data.reduce((best, w, i) => (w.total > (data[best]?.total ?? 0) ? i : best), 0);

  return (
    <section className="border border-ink-700 bg-ink-850">
      <header className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 border-b border-ink-700 px-5 py-4">
        <div>
          <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
            Ventas por semana
          </h2>
          <p className="mt-1 text-[11.5px] text-content-dim">
            Últimas 12 semanas · solo pedidos pagados
          </p>
        </div>
        <p className="text-right">
          <span className="block text-[26px] font-semibold leading-none text-content">
            {formatBsCompact(total)}
          </span>
          <span className="mt-1 block text-[11px] text-content-dim">
            {conVentas} {conVentas === 1 ? "semana con ventas" : "semanas con ventas"}
          </span>
        </p>
      </header>

      <div className="px-5 pb-4 pt-5">
        <div className="flex gap-3">
          {/* Eje Y. Cada marca se ancla al mismo % que su línea de grilla en vez
              de repartirse con justify-between: así queda exactamente sobre la
              línea, y la columna no se estira hacia la fila de fechas (con
              justify-between el "0" terminaba debajo del piso del gráfico). */}
          <div className="relative h-[188px] w-[46px] shrink-0" aria-hidden>
            {GRID_STEPS.map((s) => (
              <span
                key={s}
                className="absolute right-0 translate-y-1/2 text-[10px] leading-none text-content-faint tabular"
                style={{ bottom: `${s * 100}%` }}
              >
                {formatBsCompact(max * s).replace("Bs ", "")}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-[188px]">
              {/* Grilla: líneas sólidas de 1px, un paso por encima del fondo. */}
              {GRID_STEPS.map((s) => (
                <span
                  key={s}
                  className="absolute inset-x-0 h-px bg-line"
                  style={{ bottom: `${s * 100}%` }}
                  aria-hidden
                />
              ))}

              <ol className="absolute inset-0 flex items-end">
                {data.map((w, i) => {
                  const esUltima = i === ultimo;
                  const alto = max > 0 ? (w.total / max) * 100 : 0;
                  return (
                    <li
                      key={w.weekStart}
                      /* px-px garantiza 2px de aire entre barras vecinas incluso
                         en pantallas angostas, donde el slot se achica hasta el
                         ancho de la barra y quedarían pegadas formando un bloque. */
                      className="group relative flex h-full flex-1 items-end justify-center px-px"
                    >
                      {/* La barra no llena el espacio: se limita a 24px y el resto
                          del slot queda como aire, que es lo que separa una de otra. */}
                      <div
                        tabIndex={0}
                        role="img"
                        aria-label={`Semana del ${weekLabel(w.weekStart)}: ${formatBs(w.total)}`}
                        className={cn(
                          "w-full max-w-[24px] origin-bottom rounded-t-[4px] outline-none transition-colors",
                          "animate-grow-y focus-visible:ring-2 focus-visible:ring-brand/60",
                          esUltima ? "bg-brand" : "bg-[#45443F] group-hover:bg-[#5A5852]",
                        )}
                        style={{ height: `max(2px, ${alto}%)` }}
                      />

                      {/* Capa de detalle: aparece al pasar el mouse y también al
                          enfocar con teclado, para que no sea solo de mouse. */}
                      <div
                        className={cn(
                          "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2",
                          "whitespace-nowrap border border-line-strong bg-ink-900 px-2.5 py-1.5 shadow-card",
                          "group-hover:block group-focus-within:block",
                        )}
                      >
                        <span className="block text-[10px] uppercase tracking-[0.1em] text-content-dim">
                          {weekLabel(w.weekStart)}
                        </span>
                        <span className="block text-[13px] font-bold text-content tabular">
                          {formatBs(w.total)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Etiqueta directa sobre el mejor pico: el resto lo cuenta el eje. */}
              {max > 0 && data[mejor] && (data[mejor]?.total ?? 0) > 0 ? (
                <span
                  className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1 text-[10px] font-bold text-content-muted tabular"
                  style={{
                    left: `${((mejor + 0.5) / data.length) * 100}%`,
                    bottom: `${((data[mejor]?.total ?? 0) / max) * 100}%`,
                  }}
                >
                  {formatBsCompact(data[mejor]?.total ?? 0)}
                </span>
              ) : null}
            </div>

            {/* Fechas reales, una sí y una no para que no se amontonen. */}
            <ol className="mt-2 flex" aria-hidden>
              {data.map((w, i) => (
                <li key={w.weekStart} className="flex-1 text-center text-[10px] text-content-faint">
                  {i % 2 === 1 ? weekLabel(w.weekStart) : ""}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <TablaVentas data={data} />
      </div>
    </section>
  );
}

/** Los valores nunca quedan detrás del hover: esta tabla los deja siempre a mano. */
function TablaVentas({ data }: { data: { weekStart: string; total: number }[] }) {
  return (
    <details className="mt-4 border-t border-line-soft pt-3">
      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.1em] text-content-dim transition-colors hover:text-brand">
        Ver los números
      </summary>
      <table className="mt-3 w-full text-[12.5px]">
        <caption className="sr-only">Ventas pagadas por semana, últimas 12 semanas</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.14em] text-content-dim">
            <th scope="col" className="py-1.5 text-left font-normal">Semana del</th>
            <th scope="col" className="py-1.5 text-right font-normal">Ventas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((w) => (
            <tr key={w.weekStart} className="border-t border-line-soft">
              <td className="py-1.5 text-content-muted">{weekLabel(w.weekStart)}</td>
              <td className="py-1.5 text-right tabular">{formatBs(w.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/* ── Pedidos por estado ───────────────────────────────────────────────────── */

export function StatusBreakdown({ data }: { data: { status: string; n: number }[] }) {
  const total = data.reduce((n, s) => n + s.n, 0);

  // Orden fijo del flujo, no el que devuelva la base: así el color de cada
  // estado nunca se mueve de lugar entre una carga y otra.
  const filas = ORDER_STATUS_ORDER.map((status) => ({
    status,
    n: data.find((d) => d.status === status)?.n ?? 0,
  })).filter((f) => f.n > 0);

  return (
    <section className="flex flex-col border border-ink-700 bg-ink-850">
      <header className="border-b border-ink-700 px-5 py-4">
        <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
          Pedidos por estado
        </h2>
        <p className="mt-1 text-[11.5px] text-content-dim">
          {total} {total === 1 ? "pedido en total" : "pedidos en total"}
        </p>
      </header>

      {total === 0 ? (
        <p className="flex-1 px-5 py-12 text-center text-[13px] text-content-dim">
          Todavía no hay pedidos.
        </p>
      ) : (
        <div className="flex flex-1 flex-col px-5 py-5">
          {/* Barra apilada: los segmentos se separan con 2px del color de la
              superficie, no con un borde alrededor de cada uno. */}
          <div className="flex h-3.5 gap-[2px]">
            {filas.map((f) => (
              <div
                key={f.status}
                className="first:rounded-l-[3px] last:rounded-r-[3px]"
                style={{
                  width: `${(f.n / total) * 100}%`,
                  background: ORDER_STATUS_META[f.status].color,
                }}
              />
            ))}
          </div>

          <ul className="mt-5 flex flex-col">
            {filas.map((f) => {
              const meta = ORDER_STATUS_META[f.status];
              const pct = Math.round((f.n / total) * 100);
              return (
                <li
                  key={f.status}
                  className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                >
                  <span
                    className="block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ background: meta.color }}
                    aria-hidden
                  />
                  <span className="flex-1 text-[13px] text-content-muted">{meta.label}</span>
                  <span className="w-10 text-right text-[11.5px] text-content-dim tabular">
                    {pct}%
                  </span>
                  <span className="w-8 text-right text-[13.5px] font-extrabold tabular">{f.n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ── Más vendidos ─────────────────────────────────────────────────────────── */

export function TopProducts({
  data,
}: {
  data: { name: string; units: number; amount: string }[];
}) {
  const max = Math.max(1, ...data.map((t) => t.units));

  return (
    <section className="border border-ink-700 bg-ink-850">
      <header className="border-b border-ink-700 px-5 py-4">
        <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">Más vendidos</h2>
        <p className="mt-1 text-[11.5px] text-content-dim">
          Unidades sobre pedidos pagados
        </p>
      </header>

      {data.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-content-dim">
          Todavía no hay ventas confirmadas.
        </p>
      ) : (
        <ol className="px-5 py-2">
          {data.map((t, i) => (
            <li key={t.name} className="border-b border-line-soft py-3 last:border-b-0">
              <div className="flex items-baseline gap-3">
                <span className="w-4 shrink-0 text-[12px] text-content-faint tabular">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{t.name}</span>
                <span className="shrink-0 text-[13.5px] font-extrabold tabular">
                  {t.units} u.
                </span>
                <span className="w-[74px] shrink-0 text-right text-[11.5px] text-content-dim tabular">
                  {formatBsCompact(t.amount)}
                </span>
              </div>
              {/* Una sola serie, un solo color: la barra mide, no identifica. */}
              <div className="ml-7 mt-2 h-1.5 rounded-[2px] bg-line-soft">
                <div
                  className="h-full rounded-[2px] bg-brand"
                  style={{ width: `${Math.max(3, (t.units / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ── Tarjeta de indicador ─────────────────────────────────────────────────── */

export type KpiTone = "ok" | "warn" | "alert" | "muted";

const TONE_CLASS: Record<KpiTone, string> = {
  ok: "text-state-ok",
  warn: "text-state-warn",
  alert: "text-alert-soft",
  muted: "text-content-dim",
};

export function KpiTile({
  label,
  value,
  delta,
  tone = "muted",
  spark,
}: {
  label: string;
  value: string;
  delta: string;
  tone?: KpiTone;
  /** Serie corta de contexto; se dibuja detrás del número, muy tenue. */
  spark?: number[];
}) {
  return (
    <div className="relative overflow-hidden border border-ink-700 bg-ink-850 p-[18px]">
      {spark && spark.length > 1 ? <Sparkline values={spark} /> : null}
      <p className="relative text-[10.5px] uppercase tracking-[0.18em] text-content-dim">{label}</p>
      {/* Cifra grande con figuras proporcionales: `tabular` acá deja los números
          sueltos y con huecos, solo sirve en columnas que se alinean. */}
      <p className="relative mt-2 text-[32px] font-semibold leading-none tracking-[-0.01em] text-content">
        {value}
      </p>
      <p className={cn("relative mt-1.5 text-[11.5px]", TONE_CLASS[tone])}>{delta}</p>
    </div>
  );
}

/** Contexto de fondo, no dato para leer: por eso va sin ejes ni etiquetas. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const puntos = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 26}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[52px] w-full opacity-[0.22]"
    >
      <polyline
        points={puntos}
        fill="none"
        stroke="#FA2A00"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
