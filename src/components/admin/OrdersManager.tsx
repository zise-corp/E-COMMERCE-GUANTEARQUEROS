"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OrderSummary } from "@/db/queries/orders";
import { cn } from "@/lib/cn";
import { formatBs } from "@/lib/money";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABEL, PAYMENT_STATE_META, paymentState, type PaymentStateKey } from "@/lib/order-status";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { AdminPagination, ADMIN_PAGE_SIZE } from "./AdminPagination";
import { PaymentBadge } from "./PaymentBadge";

export type OrderRow = {
  id: number;
  number: number;
  customerName: string;
  customerPhone: string;
  mode: "pickup" | "delivery";
  department: string | null;
  status: OrderSummary["status"];
  paymentStatus: OrderSummary["paymentStatus"];
  financialStatus: OrderSummary["financialStatus"];
  paymentMethod: string | null;
  transactionId: string | null;
  total: string;
  createdAt: string;
};

/** Se re-exporta para no tocar los imports existentes; la definición vive en lib. */
export const STATUS_META = ORDER_STATUS_META;

type StatusFilter = "Todos" | OrderSummary["status"];
type PaymentFilter = "todos" | "pagados" | "esperando" | "sin_pagar";

// El punto de color de cada opción es el mismo de su etiqueta en la tabla.
const STATUS_OPTIONS: { key: StatusFilter; label: string; color: string | null }[] = [
  { key: "Todos", label: "Todos", color: null },
  { key: "recibido", label: "Recibido", color: ORDER_STATUS_META.recibido.color },
  { key: "en_proceso", label: "En proceso", color: ORDER_STATUS_META.en_proceso.color },
  { key: "completado", label: "Completado", color: ORDER_STATUS_META.completado.color },
  { key: "cancelado", label: "Cancelado", color: ORDER_STATUS_META.cancelado.color },
];

const PAYMENT_OPTIONS: { key: PaymentFilter; label: string; states: PaymentStateKey[] | null; color: string | null }[] = [
  { key: "todos", label: "Todos", states: null, color: null },
  { key: "pagados", label: "Pagados", states: ["paid", "review"], color: PAYMENT_STATE_META.paid.color },
  { key: "esperando", label: "Esperando pago", states: ["waiting"], color: PAYMENT_STATE_META.waiting.color },
  { key: "sin_pagar", label: "Sin pagar", states: ["unpaid", "abandoned", "failed"], color: PAYMENT_STATE_META.unpaid.color },
];

/** Cada cuánto se vuelve a pedir la lista: un pago que confirma YoPago aparece sin recargar. */
const REFRESH_MS = 20_000;

const GRID = "lg:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1fr)_116px_176px_96px_16px]";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "numeric", month: "short", timeZone: "America/La_Paz" });
}

function matchesStatus(row: OrderRow, filter: StatusFilter) {
  return filter === "Todos" || row.status === filter;
}

function matchesPayment(row: OrderRow, filter: PaymentFilter) {
  const states = PAYMENT_OPTIONS.find((option) => option.key === filter)?.states;
  return !states || states.includes(paymentState(row));
}

export function OrdersManager({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  // Cada grupo cuenta sobre lo que deja pasar el otro filtro.
  const forStatusCounts = rows.filter((r) => matchesPayment(r, paymentFilter));
  const forPaymentCounts = rows.filter((r) => matchesStatus(r, statusFilter));
  const visible = forStatusCounts.filter((r) => matchesStatus(r, statusFilter));
  const pageCount = Math.max(1, Math.ceil(visible.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  return (
    <>
      <div className="admin-data-card border border-ink-700 bg-ink-850">
        <div className="flex flex-col gap-3 border-b border-ink-700 px-5 py-4">
          <FilterRow label="Estado" aside={<LiveIndicator />}>
            <Segmented
              value={statusFilter}
              onChange={(key) => { setStatusFilter(key); setPage(1); }}
              options={STATUS_OPTIONS.map((option) => ({
                ...option,
                count: forStatusCounts.filter((r) => matchesStatus(r, option.key)).length,
              }))}
            />
          </FilterRow>
          <FilterRow label="Pago">
            <Segmented
              value={paymentFilter}
              onChange={(key) => { setPaymentFilter(key); setPage(1); }}
              options={PAYMENT_OPTIONS.map((option) => ({
                ...option,
                count: forPaymentCounts.filter((r) => matchesPayment(r, option.key)).length,
              }))}
            />
          </FilterRow>
        </div>

        <div className={cn("hidden gap-3 border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid", GRID)}>
          <span>N° · Fecha</span>
          <span>Cliente</span>
          <span>Entrega</span>
          <span>Estado</span>
          <span>Pago</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-content-dim">
            {rows.length === 0 ? "Todavía no hay pedidos." : "Ningún pedido con esos filtros."}
          </p>
        ) : null}

        {paged.map((o) => {
          const meta = STATUS_META[o.status];
          const pay = paymentState(o);
          const showPaymentRef = pay === "paid" || pay === "review" || pay === "waiting";
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOpenId(o.id)}
              className={cn("admin-data-row grid w-full items-center gap-3 border-b border-line-soft px-5 py-3.5 text-left transition-colors duration-150", GRID)}
            >
              <span className="flex items-baseline gap-2 lg:flex-col lg:items-start lg:gap-0.5">
                <span className="font-display text-[15px] text-brand tabular">#{o.number}</span>
                <span className="text-[11px] text-content-faint">{formatDate(o.createdAt)}</span>
              </span>

              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold">{o.customerName}</span>
                <span className="block text-[11px] text-content-faint">{o.customerPhone}</span>
              </span>

              <span className="min-w-0 truncate text-[12.5px] text-content-muted">
                {o.mode === "pickup" ? "Retiro en local" : `Envío · ${o.department ?? "—"}`}
              </span>

              <span>
                <span
                  className="inline-block px-2.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.1em]"
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </span>
              </span>

              <span className="flex min-w-0 flex-col items-start gap-1">
                <PaymentBadge state={pay} />
                {showPaymentRef && o.paymentMethod ? (
                  <span className="max-w-full truncate text-[10.5px] text-content-faint" title={o.transactionId ?? undefined}>
                    {PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}
                    {o.transactionId ? ` · ID ${o.transactionId}` : ""}
                  </span>
                ) : null}
              </span>

              <span className="text-[13.5px] font-extrabold tabular lg:text-right">{formatBs(o.total)}</span>
              <span aria-hidden className="hidden text-right text-content-muted lg:block">→</span>
            </button>
          );
        })}
        <AdminPagination page={safePage} total={visible.length} onChange={setPage} />
      </div>

      <OrderDetailDrawer
        orderId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => router.refresh()}
      />
    </>
  );
}

/**
 * Etiqueta arriba y control abajo; desde xl, todo en una fila. En pantallas
 * angostas el control se desplaza de costado, sin barra y con el borde
 * difuminado para que se note que hay más opciones.
 */
function FilterRow({ label, aside, children }: { label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 xl:grid-cols-[56px_minmax(0,1fr)_auto]">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-content-dim">{label}</span>
      <div className="col-span-2 row-start-2 min-w-0 overflow-x-auto [mask-image:linear-gradient(to_right,#000_86%,transparent)] [scrollbar-width:none] md:[mask-image:none] xl:col-span-1 xl:row-start-auto [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {aside ?? <span />}
    </div>
  );
}

type SegmentOption<K extends string> = { key: K; label: string; count: number; color: string | null };

function Segmented<K extends string>({ options, value, onChange }: { options: SegmentOption<K>[]; value: K; onChange: (key: K) => void }) {
  return (
    <div className="inline-flex border border-line-strong">
      {options.map((option, index) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-[12px] font-bold transition-colors duration-150",
              index > 0 && "border-l border-line-strong",
              active
                ? "bg-brand/[0.12] text-brand shadow-[inset_0_-2px_0_#FA2A00]"
                : "text-content-muted hover:bg-ink-800 hover:text-content",
              option.count === 0 && !active && "text-content-faint",
            )}
          >
            {option.color ? <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: option.color }} /> : null}
            {option.label}
            <span
              className={cn(
                "min-w-[22px] px-1.5 py-px text-center text-[10.5px] font-extrabold tabular",
                active ? "bg-brand text-ink-950" : "bg-ink-700 text-content-dim",
              )}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LiveIndicator() {
  return (
    <span
      className="flex items-center gap-2 whitespace-nowrap text-[11px] text-content-dim"
      title="La lista se vuelve a consultar cada 20 segundos mientras la pestaña está abierta"
    >
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-state-ok opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-state-ok" />
      </span>
      En vivo · cada 20 s
    </span>
  );
}
