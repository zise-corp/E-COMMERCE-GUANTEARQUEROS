"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldIcon } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { formatBs, toNumber } from "@/lib/money";
import { CheckoutSteps } from "./CheckoutSteps";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";
import { SupportModal } from "./SupportModal";

type Method = "qr" | "card";

type Intent = {
  transactionId: string;
  method: Method;
  amount: string;
  qrImage: string | null;
  checkoutUrl: string | null;
};

export type PaymentOrder = {
  id: number;
  publicId: string;
  number: number;
  total: string;
  paymentStatus: string;
  subtotal: number | null;
  shipping: number | null;
  discount: number | null;
  pickup: boolean;
  items: {
    name: string;
    size: string | null;
    unitPrice: string;
    quantity: number;
    imagePublicId: string | null;
    personalization: string | null;
  }[];
};

const POLL_MS = 4000;

export function PaymentClient({ order }: { order: PaymentOrder }) {
  const router = useRouter();
  const cart = useCart();
  const [method, setMethod] = useState<Method | null>("qr");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const settled = useRef(false);
  const initialQrRequested = useRef(false);
  const requestSequence = useRef(0);
  const requestBusy = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  /** El pago se genera solo al elegir método, sin botón extra. */
  const pick = useCallback(
    async (next: Method) => {
      if (requestBusy.current) return;
      requestBusy.current = true;
      const requestId = ++requestSequence.current;
      setMethod(next);
      setIntent(null);
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/payments/yopago", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: order.publicId, method: next }),
        });
        const data = (await res.json()) as
          | { ok: true; intent: Intent }
          | { ok: false; error: string };
        if (requestId !== requestSequence.current) return;
        if (!res.ok || !data.ok) {
          setError(data.ok ? "No pudimos generar el pago." : data.error);
          return;
        }
        setIntent(data.intent);
      } catch {
        if (requestId !== requestSequence.current) return;
        setError("No pudimos conectar con la pasarela. Prueba de nuevo o escríbenos.");
      } finally {
        requestBusy.current = false;
        if (requestId === requestSequence.current) setLoading(false);
      }
    },
    [order.publicId],
  );

  // QR es la opción principal: se selecciona y genera al entrar, sin un clic extra.
  useEffect(() => {
    if (initialQrRequested.current) return;
    initialQrRequested.current = true;
    void pick("qr");
  }, [pick]);

  /** Polling cada 4s. El webhook es la fuente de verdad; acá solo se lee. */
  useEffect(() => {
    if (!intent) return;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/payment-status/${order.publicId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          status?: string;
        };
        if (cancelled || !data.ok || !data.status) return;

        if ((data.status === "paid" || data.status === "paid_inventory_review") && !settled.current) {
          settled.current = true;
          if (cart.orderId === order.id) { cart.clear(); cart.setOrderId(null); cart.setShippingDraft(null); }
          window.scrollTo(0, 0);
          router.replace(`/checkout/confirmacion?pedido=${order.id}`);
        } else if (data.status === "payment_failed") {
          setError("El pago fue rechazado. Prueba con el otro método o escríbenos.");
          setIntent(null);
          setMethod(null);
        } else if (data.status === "cancelled") {
          setError("Este intento cambió o fue cancelado. Vuelve a seleccionar un método de pago.");
          setIntent(null);
          setMethod(null);
        }
      } catch {
        // Un fallo de red puntual no rompe el polling: se reintenta al próximo tick.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intent, order.id, order.publicId, cart, router]);

  useEffect(() => {
    if (!intent) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [intent]);

  async function backToShipping() {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/yopago/abandon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.publicId }),
      });
      const data = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "No pudimos volver al formulario.");
        return;
      }
      setIntent(null);
      cart.setOrderId(null);
      setLeaveOpen(false);
      router.push("/checkout/envio");
    } catch { setError("No pudimos conectar con el servidor. Intenta de nuevo."); }
    finally { requestBusy.current = false; setSubmitting(false); }
  }

  return (
    <section className="mx-auto w-full max-w-[1160px] px-5 py-8 pb-20 sm:px-8 sm:py-[34px]">
      <CheckoutSteps current={2} />

      <button
        type="button"
        onClick={() => intent ? setLeaveOpen(true) : void backToShipping()}
        disabled={loading || submitting}
        className="mb-[22px] inline-flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors duration-150 hover:text-brand"
      >
        ← Volver a envío
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
        <div className="border border-line bg-ink-900 p-5 sm:p-[26px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-[26px] uppercase skew-fast-6">Método de pago</h1>
            <span className="flex items-center gap-2 border border-[#2F5C3A] bg-[#2E5C3A]/[0.16] px-2.5 py-[7px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#7FD69B]">
              <ShieldIcon size={13} />
              Pago seguro SSL
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MethodCard
              active={method === "qr"}
              title="QR simple"
              detail="Cualquier banco · YoPago"
              onClick={() => pick("qr")}
              disabled={loading || submitting}
            />
            <MethodCard
              active={method === "card"}
              title="Tarjeta"
              detail="Débito / crédito · YoPago"
              onClick={() => pick("card")}
              disabled={loading || submitting}
            />
          </div>

          {loading ? (
            <div className="mt-[22px] flex h-[300px] flex-col items-center justify-center gap-3.5 border border-dashed border-[#3A3A38]">
              <Spinner />
              <p className="text-[13px] text-content-muted">
                Generando pago de {formatBs(order.total)}…
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-[22px] border-l-[3px] border-alert bg-alert/10 px-4 py-3 text-[13px] leading-relaxed text-alert-soft"
            >
              {error}
            </p>
          ) : null}

          {!loading && intent?.method === "qr" ? (
            <div className="mt-[22px] flex flex-col items-center gap-4 border border-line bg-ink-950 p-6 sm:p-7">
              {intent.qrImage ? (
                <Image
                  src={intent.qrImage}
                  alt={`QR de pago del pedido ${order.number}`}
                  width={256}
                  height={256}
                  unoptimized
                  className="h-48 w-48 border-[10px] border-content bg-content sm:h-64 sm:w-64"
                />
              ) : (
                <div
                  className="h-48 w-48 border-[10px] border-content sm:h-64 sm:w-64"
                  style={{
                    background:
                      "repeating-conic-gradient(#F5F3F0 0% 25%, #0A0A0A 0% 50%) 0 0 / 22px 22px",
                  }}
                  role="img"
                  aria-label="Código QR de pago no disponible"
                />
              )}
              <p className="text-xs tracking-[0.1em] text-content-dim tabular">
                ID de Transacción: {intent.transactionId}
              </p>
              <p className="text-center text-[13px] text-content-muted">
                Escanea con la app de tu banco. El monto ya viene cargado.
              </p>
            </div>
          ) : null}

          {!loading && intent?.method === "card" ? (
            <div className="mt-[22px]">
              <div
                className="border border-line bg-ink-950"
                style={{ height: "min(70dvh, 500px)" }}
              >
                {intent.checkoutUrl ? (
                  // Embebido como en Tienda-Virtual. El formulario vive en el
                  // dominio de YoPago: la tienda nunca ve los datos de la tarjeta.
                  // bg-white: si su página no pinta fondo, el texto sigue legible.
                  <iframe
                    src={intent.checkoutUrl}
                    title="Formulario de pago con tarjeta de YoPago"
                    className="h-full w-full border-0 bg-white"
                    allow="payment"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="label-xs text-content-dim">Formulario de tarjeta · YoPago</p>
                    <p className="text-[13px] text-content-muted">
                      No pudimos abrir la pasarela de tarjeta.
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-xs tracking-[0.1em] text-content-dim tabular">
                Conexión segura con YoPago · ID de Transacción: {intent.transactionId}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-[132px]">
          <div className="border border-line bg-ink-900 p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl uppercase skew-fast-6">Resumen del pedido</h2>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-dim">
                Pedido #{order.number}
              </span>
            </div>

            <ul>
              {order.items.map((i, idx) => (
                <li
                  key={`${i.name}-${idx}`}
                  className="flex gap-3 border-b border-ink-800 py-2.5 last:border-b-0"
                >
                  <span className="relative block h-[46px] w-[46px] flex-none overflow-hidden bg-ink-950">
                    <ProductImage publicId={i.imagePublicId} alt={i.name} preset="thumb" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block font-bold">{i.name}</span>
                    <span className="mt-0.5 block text-content-dim">
                      {i.size ? `Talla ${i.size} · ` : ""}
                      {i.quantity} × {formatBs(i.unitPrice)}
                    </span>
                    {i.personalization ? <span className="mt-0.5 block text-[11px] text-drei-ink">Grabado: “{i.personalization}” · +0 Bs</span> : null}
                  </span>
                  <span className="text-[13.5px] font-extrabold tabular">
                    {formatBs(toNumber(i.unitPrice) * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {order.subtotal !== null && order.shipping !== null && order.discount !== null ? <div className="mt-4 space-y-2 border-t border-ink-800 pt-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-content-dim">Subtotal</span>
                <span>{formatBs(order.subtotal)}</span>
              </div>
              {order.pickup ? (
                <div className="flex justify-between">
                  <span className="text-content-dim">Retiro en el local</span>
                  <span className="text-state-ok">Sin costo</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-content-dim">Envío</span>
                  <span>{formatBs(order.shipping)}</span>
                </div>
              )}
              {order.discount > 0 ? (
                <div className="flex justify-between text-state-ok">
                  <span>Descuento</span>
                  <span>− {formatBs(order.discount)}</span>
                </div>
              ) : null}
            </div> : <p className="mt-4 text-xs text-content-dim">Pedido anterior: se conserva el total original; el desglose no está disponible.</p>}

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="label-xs tracking-[0.14em] text-content-dim">Total</span>
              <span className="font-display text-[34px] leading-none text-brand tabular">
                {formatBs(order.total)}
              </span>
            </div>
          </div>

          {intent ? (
            <div
              className="flex items-center gap-3 border-l-[3px] border-brand bg-brand/[0.08] px-4 py-3.5"
              role="status"
              aria-live="polite"
            >
              <Spinner size={18} />
              <span className="text-[12.5px] leading-snug text-[#E8C8BC]">
                Esperando confirmación de pago… no cierres esta ventana.
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="border border-[#3A3A38] px-4 py-3.5 text-center text-[12.5px] font-bold text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            ¿Problemas con el pago? Contactar soporte
          </button>

        </div>
      </div>

      <SupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        orderNumber={order.number}
      />
      <Modal
        open={leaveOpen}
        onClose={() => submitting ? undefined : setLeaveOpen(false)}
        title="Volver y editar la compra"
        description="Ya existe un intento de pago para esta orden. No se eliminará: si ya pagaste, la confirmación seguirá procesándose aunque salgas. Si continúas, editaremos el carrito como una compra nueva; no pagues el intento anterior."
        width={500}
      >
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" disabled={submitting} onClick={() => setLeaveOpen(false)} className="border border-line-strong px-4 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-content-muted disabled:opacity-50">Continuar con el pago</button>
          <button type="button" disabled={submitting} onClick={() => void backToShipping()} className="bg-brand px-4 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-ink-950 disabled:opacity-50">{submitting ? "Procesando…" : "Abandonar intento y editar"}</button>
        </div>
      </Modal>
    </section>
  );
}

function MethodCard({
  active,
  title,
  detail,
  onClick,
  disabled,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "border p-5 text-left transition-colors duration-150",
        active ? "border-brand bg-brand/[0.09]" : "border-line-strong bg-[#0F0F0E] hover:border-[#3A3A38]",
      )}
    >
      <span className="block font-display text-[22px] uppercase skew-fast-6">{title}</span>
      <span className="mt-1.5 block text-[12.5px] text-content-muted">{detail}</span>
    </button>
  );
}
