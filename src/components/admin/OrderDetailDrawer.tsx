"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { setOrderStatusAction } from "@/app/admin/actions";
import { Escudo } from "@/components/brand/Escudo";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { OrderSummary } from "@/db/queries/orders";
import { imageKitUrl } from "@/lib/images";
import { formatBs, toNumber } from "@/lib/money";
import { PAYMENT_METHOD_LABEL, paymentState } from "@/lib/order-status";
import { isLocalDepartment, whatsappLink } from "@/lib/site";
import { STATUS_META } from "./OrdersManager";
import { OrderLocationMap } from "./OrderLocationMap";
import { PaymentBadge } from "./PaymentBadge";

const STATUSES: OrderSummary["status"][] = ["recibido", "en_proceso", "completado", "cancelado"];

/**
 * Espejo de la lógica autorizada en `setOrderStatus` ([src/db/queries/orders.ts]).
 * Se replica aquí solo para INHABILITAR visualmente los botones que de todas
 * formas el server rechazaría — la decisión real sigue siendo del server.
 */
const ALLOWED_TRANSITIONS: Record<OrderSummary["status"], OrderSummary["status"][]> = {
  recibido: ["en_proceso", "cancelado"],
  en_proceso: ["completado"],
  completado: [],
  cancelado: [],
};

function transitionCheck(
  order: Pick<OrderSummary, "status" | "paymentStatus" | "financialStatus" | "transactionId">,
  next: OrderSummary["status"],
): { allowed: true } | { allowed: false; reason: string } {
  if (order.status === next) return { allowed: false, reason: "Es el estado actual del pedido." };
  if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
    return { allowed: false, reason: `No se puede volver de “${order.status}” a “${next}”.` };
  }
  if (next === "cancelado") {
    if (order.paymentStatus === "pagado") {
      return { allowed: false, reason: "El pedido ya está pagado. Reembolsa primero el cobro en YoPago; cancelarlo aquí no devuelve el dinero." };
    }
    if (order.paymentStatus === "reembolsado") {
      return { allowed: false, reason: "El pago fue reembolsado; el pedido queda en su estado final." };
    }
    const paymentIntentActive = Boolean(order.transactionId)
      && order.paymentStatus === "pendiente"
      && (order.financialStatus === "pending" || order.financialStatus === "payment_created");
    if (paymentIntentActive) {
      return { allowed: false, reason: "Hay un intento de pago vivo en YoPago. Espera a que se confirme o se abandone antes de cancelar." };
    }
    return { allowed: true };
  }
  // Para cualquier avance (en_proceso, completado) el pago tiene que estar confirmado.
  if (order.paymentStatus !== "pagado") {
    return { allowed: false, reason: "El pedido necesita estar pagado para avanzar operativamente." };
  }
  return { allowed: true };
}

const DOCUMENT_LABELS: Record<OrderSummary["documentType"], string> = {
  ci: "Cédula de identidad",
  nit: "NIT",
  passport: "Pasaporte",
  foreign_id: "Documento extranjero",
};

function identityDocument(order: OrderSummary) {
  if (!order.documentId) return "—";
  return order.documentType === "ci" && order.documentComplement
    ? `${order.documentId}-${order.documentComplement}`
    : order.documentId;
}

/** Las fechas llegan como texto desde la API: se aceptan ambas formas. */
function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  // Pedimos confirmación para transiciones irreversibles (completado, cancelado).
  // `recibido → en_proceso` se queda a un click porque es el flujo normal del
  // pedido pagado y no cierra nada. Cuando `pendingStatus` es null el modal
  // está oculto.
  const [pendingStatus, setPendingStatus] = useState<OrderSummary["status"] | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if (orderId === null) {
      setOrder(null);
      setPendingStatus(null);
      return;
    }
    // Al cambiar de pedido, descartamos cualquier modal abierto del anterior.
    setPendingStatus(null);
    let cancelled = false;
    let fetching = false;
    const refresh = async (initial: boolean) => {
      if (fetching) return;
      fetching = true;
      if (initial) setLoading(true);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; order?: OrderSummary };
        if (!cancelled && data.ok && data.order) setOrder(data.order);
      } catch {
        // Una falla puntual no cierra el detalle; el siguiente ciclo reintenta.
      } finally {
        fetching = false;
        if (!cancelled && initial) setLoading(false);
      }
    };
    void refresh(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId]);

  // Estados que requieren confirmación (irreversibles una vez aplicados).
  const requiresConfirmation = (status: OrderSummary["status"]) =>
    status === "completado" || status === "cancelado";

  function requestStatusChange(next: OrderSummary["status"]) {
    if (!order) return;
    if (requiresConfirmation(next)) {
      setPendingStatus(next);
      return;
    }
    applyStatusChange(next);
  }

  function applyStatusChange(next: OrderSummary["status"]) {
    if (!order) return;
    startTransition(async () => {
      const result = await setOrderStatusAction(order.id, next);
      if (result.ok) {
        setOrder({ ...order, status: next });
        show(`Pedido marcado como ${STATUS_META[next].label.toLowerCase()}.`);
        onChanged();
      } else {
        show(result.error, "error");
      }
      // Cerramos el modal pase lo que pase: éxito ya se refleja arriba, y en
      // error el toast muestra el motivo del server.
      setPendingStatus(null);
    });
  }

  const isLocal = order?.mode === "delivery" && isLocalDepartment(order.department);
  const payState = order ? paymentState(order) : "unpaid";
  const customerWhatsapp = order
    ? whatsappLink(
        `Hola ${order.customerName}, te contactamos de Guante Arqueros Bolivia por tu pedido #${order.number}.`,
        normalizeBolivianPhone(order.customerPhone),
      )
    : "";

  const deliveryRows: { k: string; v: string }[] = !order
    ? []
    : order.mode === "pickup"
      ? [
          { k: "Modalidad", v: "Retiro en el local" },
          { k: "Sucursal", v: `Sucursal de ${order.department ?? "la ciudad seleccionada"}` },
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
            // Documento y correo ya se muestran en la sección Cliente.
            { k: "Transporte", v: "A coordinar por el vendedor" },
          ];

  const confirmMeta = pendingStatus
    ? pendingStatus === "completado"
      ? {
          title: "¿Marcar pedido como completado?",
          body: "El pedido quedará cerrado y no podrá volver a cambiarse de estado desde el panel. Esta acción no se puede deshacer.",
          confirm: "Marcar completado",
        }
      : {
          title: "¿Cancelar este pedido?",
          body: "El pedido se marcará como cancelado y no se podrá reactivar. Si el cliente ya pagó, deberás gestionar el reembolso por separado en YoPago.",
          confirm: "Cancelar pedido",
        }
    : null;

  return (
    <>
    <Drawer
      open={orderId !== null}
      onClose={onClose}
      width={560}
      title={order ? `Pedido #${order.number}` : "Pedido"}
      subtitle={order ? `${formatDateTime(order.createdAt)} · Web · YoPago` : undefined}
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
            <Row
              k="Teléfono"
              v={
                <a
                  href={customerWhatsapp}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir conversación en WhatsApp"
                  className="inline-flex flex-wrap items-center gap-2 text-state-ok underline decoration-state-ok/40 underline-offset-4 transition-colors hover:text-brand"
                >
                  <span>{order.customerPhone}</span>
                </a>
              }
            />
            <Row k="Nota" v={order.note || "—"} />
            <Row k={DOCUMENT_LABELS[order.documentType]} v={identityDocument(order)} />
            <Row k="Correo" v={order.email || "—"} />
          </Section>

          <Section title="Pago">
            <Row k="Estado" v={<PaymentBadge state={payState} />} />
            <Row k="Método" v={order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod : "—"} />
            <Row k="ID de Transacción" v={order.transactionId ?? "—"} />
            {order.paidAt ? <Row k="Pagado el" v={formatDateTime(order.paidAt)} /> : null}
            {payState === "review" ? (
              <p className="mt-2.5 border-l-[3px] border-alert bg-alert/10 px-3 py-2.5 text-[12px] leading-relaxed text-alert-soft">
                YoPago confirmó el cobro, pero no había stock suficiente para todos los ítems. Revisa el inventario antes de despachar.
              </p>
            ) : null}
          </Section>

          {order.invoiceRequested ? (
            <Section title="Facturación solicitada">
              <Row k="Razón Social" v={order.businessName || "—"} />
              <Row k="NIT" v={order.taxId || "—"} />
            </Section>
          ) : null}

          <Section title="Entrega">
            {deliveryRows.map((r) => (
              <Row key={r.k} k={r.k} v={r.v} />
            ))}

            {isLocal && order.lat && order.lng ? (
              <OrderLocationMap
                lat={Number(order.lat)}
                lng={Number(order.lng)}
                mapsUrl={order.mapsUrl}
              />
            ) : null}
          </Section>

          <Section title="Ítems · precio congelado">
            {order.items.map((i, idx) => {
              const personalization = i.attributesSnapshot.find((attribute) => attribute.name === "Personalización")?.value;
              const productAttributes = i.attributesSnapshot.filter((attribute) => attribute.name !== "Personalización");
              return <div
                key={`${i.name}-${idx}`}
                className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-start gap-3 border-b border-line-soft py-3"
              >
                <span className="relative block h-[42px] w-[42px] flex-none overflow-hidden bg-ink-950">
                  {i.imagePublicId ? (
                    <Image
                      src={imageKitUrl(i.imagePublicId, "thumb")}
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
                    {productAttributes.length > 0
                      ? ` · ${productAttributes.map((a) => `${a.name}: ${a.value}`).join(" · ")}`
                      : ""}
                  </span>
                  {personalization ? (
                    <span className="mt-2.5 block border-l-[3px] border-drei-line bg-drei/[0.14] px-3 py-2.5">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-drei-ink">Personalización solicitada</span>
                        <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-state-ok">+0 Bs</span>
                      </span>
                      <span className="mt-1 block break-words text-[14px] font-extrabold text-white">“{personalization}”</span>
                    </span>
                  ) : null}
                </span>
                <span className="text-[13.5px] font-extrabold tabular">
                  {formatBs(toNumber(i.unitPrice) * i.quantity)}
                </span>
              </div>;
            })}

            {order.subtotal !== null && order.shippingAmount !== null && order.discountAmount !== null ? (
              <div className="mt-3.5 space-y-2 border-t border-line-soft pt-3 text-[12.5px]">
                <Row k="Subtotal" v={formatBs(order.subtotal)} />
                <Row k="Envío" v={formatBs(order.shippingAmount)} />
                {Number(order.discountAmount) > 0 ? (
                  <Row
                    k={order.discountCode ? `Descuento · ${order.discountCode}` : "Descuento"}
                    v={`− ${formatBs(order.discountAmount)}`}
                  />
                ) : null}
              </div>
            ) : null}
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
                const check = transitionCheck(order, s);
                // Mantenemos el estado actual siempre interactivo visualmente
                // (aunque hacer click no hace nada), para que el admin pueda
                // ver en qué estado está. Los demás se deshabilitan si la
                // transición no es válida.
                const disabled = pending || (!active && !check.allowed);
                const tooltip = active
                  ? `Estado actual: ${meta.label}`
                  : check.allowed
                    ? `Marcar como ${meta.label.toLowerCase()}`
                    : (check as { reason: string }).reason;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={disabled}
                    onClick={() => { if (check.allowed) requestStatusChange(s); }}
                    aria-pressed={active}
                    aria-disabled={disabled}
                    title={tooltip}
                    className="border px-1.5 py-[11px] text-center text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
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
            {/* Mensaje contextual: priorizamos avisar sobre el bloqueo más
                relevante para el estado actual del pedido. */}
            {order.paymentStatus === "pagado" && order.status !== "cancelado" && order.status !== "completado" ? (
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-state-ok/80">
                El pedido está pagado. Si necesitas anularlo, primero reembolsa el cobro en YoPago.
              </p>
            ) : order.paymentStatus !== "pagado" && order.status === "recibido" ? (
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-content-dim">
                Para pasar a “En proceso” el pago tiene que estar confirmado por YoPago.
              </p>
            ) : null}
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-content-faint">
              Notificación al negocio (WhatsApp/email): integración pendiente — el punto de enganche
              está marcado en el backend.
            </p>
          </Section>
        </div>
      )}
    </Drawer>

    <Modal
      open={pendingStatus !== null && order !== null}
      onClose={() => { if (!pending) setPendingStatus(null); }}
      title={confirmMeta?.title ?? ""}
      description={confirmMeta?.body}
      width={460}
    >
      {order && pendingStatus ? (
        <>
          <div className="mb-5 border-l-2 border-brand bg-brand/[0.05] px-3 py-2.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-content-dim">
              Pedido #{order.number}
            </p>
            <p className="mt-1 text-[13px] font-bold text-content">
              {order.customerName} · {formatBs(order.total)}
            </p>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPendingStatus(null)}
              disabled={pending}
              className="border border-line-strong px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-muted transition-colors hover:border-content-dim disabled:opacity-50"
            >
              Volver atrás
            </button>
            <button
              type="button"
              onClick={() => applyStatusChange(pendingStatus)}
              disabled={pending}
              className={pendingStatus === "cancelado"
                ? "inline-flex items-center gap-2 bg-alert px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-alert-soft hover:text-ink-950 disabled:opacity-50"
                : "inline-flex items-center gap-2 bg-brand px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-950 transition-colors hover:bg-brand-hot disabled:opacity-50"}
            >
              {pending ? <Spinner size={13} /> : null}
              {pending ? "Guardando…" : confirmMeta?.confirm}
            </button>
          </div>
        </>
      ) : null}
    </Modal>
    </>
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-line-soft py-[9px] text-[13.5px] sm:grid-cols-[150px_1fr]">
      <span className="text-content-dim">{k}</span>
      <span className="break-words font-semibold">{v}</span>
    </div>
  );
}

function normalizeBolivianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `591${digits}`;
  if (digits.length === 9 && digits.startsWith("0")) return `591${digits.slice(1)}`;
  return digits;
}
