"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import type { OrderSummary } from "@/db/queries/orders";
import { formatBs } from "@/lib/money";
import { ORDER_STATUS_META } from "@/lib/order-status";
import { OrderDetailDrawer } from "./OrderDetailDrawer";
import { AdminPagination, ADMIN_PAGE_SIZE } from "./AdminPagination";

export type OrderRow = {
  id: number;
  number: number;
  customerName: string;
  customerPhone: string;
  mode: "pickup" | "delivery";
  department: string | null;
  status: OrderSummary["status"];
  paymentStatus: OrderSummary["paymentStatus"];
  total: string;
  createdAt: string;
};

/** Se re-exporta para no tocar los imports existentes; la definición vive en lib. */
export const STATUS_META = ORDER_STATUS_META;

const PAYMENT_LABEL: Record<OrderSummary["paymentStatus"], string> = {
  pendiente: "Pago pendiente",
  pagado: "Pagado",
  fallido: "Pago fallido",
  reembolsado: "Reembolsado",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { day: "numeric", month: "short" });
}

export function OrdersManager({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"Todos" | OrderSummary["status"]>("Todos");
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const visible = filter === "Todos" ? rows : rows.filter((r) => r.status === filter);
  const pageCount = Math.max(1, Math.ceil(visible.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * ADMIN_PAGE_SIZE, safePage * ADMIN_PAGE_SIZE);

  const chips: { key: "Todos" | OrderSummary["status"]; label: string }[] = [
    { key: "Todos", label: "Todos" },
    { key: "recibido", label: "Recibido" },
    { key: "en_proceso", label: "En proceso" },
    { key: "completado", label: "Completado" },
    { key: "cancelado", label: "Cancelado" },
  ];

  return (
    <>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Chip key={c.key} active={filter === c.key} onClick={() => { setFilter(c.key); setPage(1); }}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="admin-data-card border border-ink-700 bg-ink-850">
        <div className="hidden gap-3 border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[70px_1.4fr_1.2fr_130px_110px_100px_70px]">
          <span>N°</span>
          <span>Cliente</span>
          <span>Entrega</span>
          <span>Estado</span>
          <span>Total</span>
          <span>Fecha</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-content-dim">
            {rows.length === 0 ? "Todavía no hay pedidos." : "Ningún pedido con ese estado."}
          </p>
        ) : null}

        {paged.map((o) => {
          const meta = STATUS_META[o.status];
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOpenId(o.id)}
              className="admin-data-row grid w-full items-center gap-3 border-b border-line-soft px-5 py-3.5 text-left transition-colors duration-150 lg:grid-cols-[70px_1.4fr_1.2fr_130px_110px_100px_70px]"
            >
              <span className="font-display text-[15px] text-brand tabular">#{o.number}</span>

              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-bold">{o.customerName}</span>
                <span className="block text-[11px] text-content-faint">{o.customerPhone}</span>
              </span>

              <span className="min-w-0 truncate text-[12.5px] text-content-muted">
                {o.mode === "pickup" ? "Retiro en local" : `Envío · ${o.department ?? "—"}`}
              </span>

              <span className="flex flex-wrap items-center gap-1.5">
                <span
                  className="px-2.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.1em]"
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </span>
                {o.paymentStatus !== "pagado" ? (
                  <span className="text-[10px] uppercase tracking-[0.1em] text-content-faint">
                    {PAYMENT_LABEL[o.paymentStatus]}
                  </span>
                ) : null}
              </span>

              <span className="text-[13.5px] font-extrabold tabular">{formatBs(o.total)}</span>
              <span className="text-xs text-content-faint">{formatDate(o.createdAt)}</span>
              <span className="text-right text-[11.5px] text-content-muted">Ver →</span>
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
