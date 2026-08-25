"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { setOrderStatusAction } from "@/app/admin/actions";
import { Escudo } from "@/components/brand/Escudo";
import { Drawer } from "@/components/ui/Drawer";
import { PinIcon } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import type { OrderSummary } from "@/db/queries/orders";
import { cloudinaryUrl } from "@/lib/images";
import { formatBs, toNumber } from "@/lib/money";
import { LOCAL_DEPARTMENT } from "@/lib/site";
import { STATUS_META } from "./OrdersManager";

const STATUSES: OrderSummary["status"][] = ["recibido", "en_proceso", "completado", "cancelado"];

const PAYMENT_LABEL: Record<OrderSummary["paymentStatus"], string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  fallido: "Fallido",
  reembolsado: "Reembolsado",
};

export function OrderDetailDrawer({
  orderId,
  onClose,
  onChanged,
}: {
  orderId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (orderId === null) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; order?: OrderSummary };
        if (!cancelled && data.ok && data.order) setOrder(data.order);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  function changeStatus(next: OrderSummary["status"]) {
    if (!order) return;
    startTransition(async () => {
      const result = await setOrderStatusAction(order.id, next);
      if (result.ok) {
        setOrder({ ...order, status: next });
        onChanged();
      }
    });
  }

  const isLocal = order?.mode === "delivery" && order.department === LOCAL_DEPARTMENT;

  const deliveryRows: { k: string; v: string }[] = !order
    ? []
    : order.mode === "pickup"
      ? [
          { k: "Modalidad", v: "Retiro en el local" },
          { k: "Sucursal", v: "Cochabamba centro" },
        ]
      : isLocal
        ? [
            { k: "Modalidad", v: "Envío a domicilio" },
            { k: "Departamento", v: `${order.department} (logística propia)` },
            { k: "Dirección", v: order.address ?? "—" },
          ]
        : [
            { k: "Modalidad", v: "Envío por transporte" },
            { k: "Departamento", v: order.department ?? "—" },
            { k: "Transporte", v: "A coordinar por el vendedor" },
            { k: "CI", v: order.documentId ?? "—" },
            { k: "Email", v: order.email ?? "—" },
          ];

  const mapsHref =
    order?.mapsUrl ??
    (order?.lat && order?.lng
      ? `https://www.google.com/maps/search/?api=1&query=${order.lat},${order.lng}`
      : null);

  return (
    <Drawer
      open={orderId !== null}
      onClose={onClose}
      width={560}
      title={order ? `Pedido #${order.number}` : "Pedido"}
      subtitle={
        order
          ? `${new Date(order.createdAt).toLocaleString("es-BO", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })} · Web · YoPago`
          : undefined
      }
      className="bg-ink-850"
    >
      {loading || !order ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-6 pb-10 pt-[22px]">
          <Section title="Cliente">
            <Row k="Nombre" v={order.customerName} />
            <Row k="Teléfono" v={order.customerPhone} />
            <Row k="Nota" v={order.note || "—"} />
            <Row k="Pago" v={PAYMENT_LABEL[order.paymentStatus]} />
            {order.paymentRef ? <Row k="TX ID" v={order.paymentRef} /> : null}
          </Section>

          <Section title="Entrega">
            {deliveryRows.map((r) => (
              <Row key={r.k} k={r.k} v={r.v} />
            ))}

            {isLocal && order.lat && order.lng ? (
              <a
                href={mapsHref ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-3 block h-[140px] border border-line-strong bg-map transition-colors duration-150 hover:border-brand"
              >
                <span
                  className="absolute left-[44%] top-[52%] block h-[26px] w-[22px] -translate-x-1/2 -translate-y-full bg-brand clip-pin"
                  style={{ boxShadow: "0 0 20px rgba(250,42,0,0.55)" }}
                  aria-hidden
                />
                <span className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-ink-950/80 px-2 py-1 text-[10.5px] uppercase tracking-[0.1em] text-[#8A8783]">
                  <PinIcon size={11} />
                  Abrir en Google Maps ↗
                </span>
                <span className="absolute bottom-2 left-2 text-[10.5px] text-content-dim tabular">
                  {Number(order.lat).toFixed(4)}, {Number(order.lng).toFixed(4)}
                </span>
              </a>
            ) : null}
          </Section>

          <Section title="Ítems · precio congelado">
            {order.items.map((i, idx) => (
              <div
                key={`${i.name}-${idx}`}
                className="flex items-center gap-3 border-b border-line-soft py-2.5"
              >
                <span className="relative block h-[42px] w-[42px] flex-none overflow-hidden bg-ink-950">
                  {i.imagePublicId ? (
                    <Image
                      src={cloudinaryUrl(i.imagePublicId, "thumb")}
                      alt=""
                      fill
                      sizes="42px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Escudo width={16} height={19} className="opacity-20" title="" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold">{i.name}</span>
                  <span className="block text-[11.5px] text-content-faint">
                    {i.size ? `${i.size} · ` : ""}
                    {i.quantity} × {formatBs(i.unitPrice)}
                    {i.attributesSnapshot.length > 0
                      ? ` · ${i.attributesSnapshot.map((a) => `${a.name}: ${a.value}`).join(" · ")}`
                      : ""}
                  </span>
                </span>
                <span className="text-[13.5px] font-extrabold tabular">
                  {formatBs(toNumber(i.unitPrice) * i.quantity)}
                </span>
              </div>
            ))}

            <div className="mt-3.5 flex items-baseline justify-between">
              <span className="label-xs tracking-[0.16em] text-content-dim">Total</span>
              <span className="font-display text-[30px] leading-none text-brand tabular">
                {formatBs(order.total)}
              </span>
            </div>
          </Section>

          <Section title="Estado del pedido">
            <div className="grid grid-cols-2 gap-[7px] sm:grid-cols-4">
              {STATUSES.map((s) => {
                const meta = STATUS_META[s];
                const active = order.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={pending}
                    onClick={() => changeStatus(s)}
                    aria-pressed={active}
                    className="border px-1.5 py-[11px] text-center text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors duration-150 disabled:opacity-60"
                    style={{
                      borderColor: active ? meta.color : "#2B2B29",
                      background: active ? meta.bg : "transparent",
                      color: active ? meta.color : "#8A8783",
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-content-faint">
              Notificación al negocio (WhatsApp/email): integración pendiente — el punto de enganche
              está marcado en el backend.
            </p>
          </Section>
        </div>
      )}
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[10.5px] uppercase tracking-[0.18em] text-content-dim">{title}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-line-soft py-[9px] text-[13.5px] sm:grid-cols-[150px_1fr]">
      <span className="text-content-dim">{k}</span>
      <span className="break-words font-semibold">{v}</span>
    </div>
  );
}
