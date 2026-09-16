"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatBs } from "@/lib/money";
import { announceNavigationStart } from "@/lib/navigation-feedback";
import { isLocalDepartment } from "@/lib/site";
import { useCart } from "./CartProvider";
import { DOCUMENT_TYPE_LABELS, formatIdentityDocument, type ShippingValues } from "./ShippingForm";
import type { OrderPricing, PricedLine } from "@/db/queries/orders";

/**
 * Último paso antes de crear el pedido. La orden se crea acá, en el server, y
 * recién con el id confirmado se avanza al pago. Si el cliente vuelve y reenvía
 * en la misma sesión se hace PATCH sobre la misma orden: no se duplica.
 */
export function ConfirmOrderModal({
  open,
  onClose,
  shipping,
  discountCode,
}: {
  open: boolean;
  onClose: () => void;
  shipping: ShippingValues;
  discountCode: string;
}) {
  const cart = useCart();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ lines: PricedLine[]; pricing: OrderPricing; token: string; payload: string; source: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const requestBody = JSON.stringify({
    shipping, discountCode,
    items: cart.checkoutItems.map((i) => ({ productId: i.productId, size: i.size, personalization: i.personalization, quantity: i.quantity })),
    ...(cart.orderId ? { orderId: cart.orderId } : {}),
  });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setQuote(null);
    setError(null);
    async function review() {
      try {
        const keyName = "gq.checkout-attempt.v2";
        let attempt: { source: string; key: string } | null = null;
        try { attempt = JSON.parse(sessionStorage.getItem(keyName) ?? "null"); } catch { /* Se reemplaza el valor inválido. */ }
        if (attempt?.source !== requestBody || !attempt?.key) {
          attempt = { source: requestBody, key: crypto.randomUUID() };
          sessionStorage.setItem(keyName, JSON.stringify(attempt));
        }
        const payload = JSON.stringify({ ...JSON.parse(requestBody), checkoutKey: attempt.key });
        const response = await fetch("/api/orders/quote", { method: "POST", headers: { "content-type": "application/json" }, body: payload, signal: controller.signal });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !data.ok) { setError(data.error ?? "No pudimos verificar el pedido."); return; }
        setQuote({ ...data.quote, payload, source: requestBody });
      } catch {
        if (!controller.signal.aborted) setError("No pudimos verificar el pedido. Revisa tu conexión e intenta de nuevo.");
      }
    }
    void review();
    return () => controller.abort();
  }, [open, requestBody, refresh]);

  const currentQuote = quote?.source === requestBody ? quote : null;

  async function confirm() {
    if (saving || !currentQuote) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { ...JSON.parse(currentQuote.payload), quoteToken: currentQuote.token };

      const res = await fetch("/api/orders", {
        method: cart.orderId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as
        | { ok: true; orderId: number; number: number }
        | { ok: false; error: string };

      if (!res.ok || !data.ok) {
        if (res.status === 409) setQuote(null);
        if (res.status === 403) { cart.setOrderId(null); setQuote(null); }
        // No se avanza: el cliente vuelve al formulario con el error a la vista.
        setError(
          !data.ok && data.error
            ? data.error
            : "No pudimos guardar el pedido. Prueba de nuevo en un momento.",
        );
        return;
      }

      cart.setOrderId(data.orderId);
      onClose();
      cart.closeCart();
      announceNavigationStart();
      router.push(`/checkout/pago?pedido=${data.orderId}`);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión y prueba de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const customerName = `${shipping.name} ${shipping.lastName}`.trim();
  const deliveryMethod = shipping.mode === "pickup"
    ? "Retiro en el local"
    : isLocalDepartment(shipping.department)
      ? "Envío a domicilio"
      : "Envío por transporte";

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Confirmar pedido"
      description="Revisa los datos antes de crear el pedido. Después de confirmar pasas al pago."
      width={900}
      accent
      showClose={false}
    >
      {!currentQuote && !error ? <p role="status" className="mb-4 text-sm text-content-muted">Verificando precios y disponibilidad…</p> : null}
      {currentQuote ? (
        <div className="space-y-4">
          <div className="grid items-start gap-4 lg:grid-cols-[1.06fr_.94fr]">
            <div className="space-y-4">
              <section>
                <SummaryHeading label="Productos" meta={`${cart.checkoutCount} ${cart.checkoutCount === 1 ? "unidad" : "unidades"}`} />
                <ul className="divide-y divide-ink-800 border border-ink-800 px-3">
                  {currentQuote.lines.map((line, index) => {
                    const personalization = cart.checkoutItems[index]?.personalization;
                    return (
                      <li key={`${line.productId}-${line.size ?? "u"}-${index}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-2.5">
                        <div className="min-w-0">
                          <p className="break-words text-[13px] font-extrabold text-content">
                            {line.quantity} × {line.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-content-dim">
                            {line.size ? <span>Talla: <strong className="text-content-muted">{line.size}</strong></span> : null}
                            <span>Unidad: <strong className="text-content-muted">{formatBs(line.unitPrice)}</strong></span>
                          </div>
                          {personalization ? (
                            <p className="mt-1 break-words border-l-2 border-brand pl-2 text-[11px] text-content-muted">
                              Grabado: <strong className="text-content">“{personalization}”</strong> · +0 Bs
                            </p>
                          ) : null}
                        </div>
                        <strong className="whitespace-nowrap text-[13px] text-content">
                          {formatBs(Number(line.unitPrice) * line.quantity)}
                        </strong>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <SummaryHeading label="Entrega" />
                <dl className="grid border border-ink-800 sm:grid-cols-2">
                  <Detail label="Modalidad" value={deliveryMethod} />
                  <Detail label="Departamento" value={shipping.department ?? "—"} />
                  {shipping.address ? <Detail label="Dirección" value={shipping.address} wide /> : null}
                  {shipping.mapsUrl ? (
                    <div className="border-b border-ink-800 p-2.5 last:border-b-0 sm:col-span-2">
                      <dt className="text-[9px] font-bold uppercase tracking-[0.13em] text-content-dim">Ubicación</dt>
                      <dd className="mt-0.5 text-[12px] font-bold">
                        <a href={shipping.mapsUrl} target="_blank" rel="noreferrer" className="break-all text-brand hover:text-brand-hot">
                          Ver ubicación registrada
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            </div>

            <div className="space-y-4">
              <section>
                <SummaryHeading label="Datos del comprador" />
                <dl className="grid border border-ink-800 sm:grid-cols-2">
                  <Detail label="Nombre completo" value={customerName} />
                  <Detail label="Teléfono / WhatsApp" value={shipping.phone} />
                  <Detail label={DOCUMENT_TYPE_LABELS[shipping.documentType]} value={formatIdentityDocument(shipping)} />
                  <Detail label="Correo electrónico" value={shipping.email} />
                  {shipping.note ? <Detail label="Nota" value={shipping.note} wide /> : null}
                </dl>
              </section>

              <section>
                <SummaryHeading label="Facturación" />
                <dl className="grid border border-ink-800 sm:grid-cols-2">
                  <Detail label="Factura" value={shipping.invoiceRequested ? "Solicitada" : "No solicitada"} />
                  {shipping.invoiceRequested ? <Detail label="Razón Social" value={shipping.businessName} /> : null}
                  {shipping.invoiceRequested ? <Detail label="NIT" value={shipping.taxId} /> : null}
                </dl>
              </section>
            </div>
          </div>

          <section aria-label="Total del pedido" className="grid border border-brand/60 bg-brand/[0.055] sm:grid-cols-[1fr_auto]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-3">
              <PriceStat label="Subtotal" value={formatBs(currentQuote.pricing.subtotal)} />
              <PriceStat label={shipping.mode === "pickup" ? "Retiro" : "Envío"} value={shipping.mode === "pickup" ? "Sin costo" : formatBs(currentQuote.pricing.shipping)} />
              {Number(currentQuote.pricing.discount) > 0 ? (
                <PriceStat label={`Descuento · ${currentQuote.pricing.discountCode}`} value={`− ${formatBs(currentQuote.pricing.discount)}`} accent />
              ) : null}
            </dl>
            <div className="flex min-w-[230px] items-center justify-between gap-5 border-t border-brand/50 bg-brand/[0.1] px-4 py-3 sm:border-l sm:border-t-0">
              <div>
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-brand">Monto total</p>
                <p className="mt-0.5 text-[10.5px] text-content-dim">Importe final</p>
              </div>
              <strong className="whitespace-nowrap font-display text-[clamp(1.75rem,6vw,2.2rem)] leading-none text-brand skew-fast-6">
                {formatBs(currentQuote.pricing.total)}
              </strong>
            </div>
          </section>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3.5 border-l-[3px] border-alert bg-alert/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-alert-soft"
        >
          {error}
        </p>
      ) : null}
      {!currentQuote && error ? <button type="button" onClick={() => setRefresh((v) => v + 1)} className="mt-3 text-sm font-bold text-brand">Volver a verificar</button> : null}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_1.4fr]">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="border border-[#3A3A38] px-4 py-[13px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors duration-150 hover:border-content hover:text-content disabled:opacity-50"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={saving || !currentQuote}
          className="flex items-center justify-center gap-2.5 bg-brand px-4 py-[13px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
        >
          {saving ? <Spinner size={16} /> : null}
          {saving ? "Guardando…" : "Sí, confirmar"}
        </button>
      </div>
    </Modal>
  );
}

function SummaryHeading({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-content-muted">{label}</h3>
      {meta ? <span className="text-[10px] uppercase tracking-[0.12em] text-content-dim">{meta}</span> : null}
    </div>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 border-b border-ink-800 p-2.5 last:border-b-0 ${wide ? "sm:col-span-2" : "sm:odd:border-r"}`}>
      <dt className="text-[9px] font-bold uppercase tracking-[0.13em] text-content-dim">{label}</dt>
      <dd className="mt-0.5 break-words text-[12px] font-bold leading-relaxed text-content">{value || "—"}</dd>
    </div>
  );
}

function PriceStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-content-dim">{label}</dt>
      <dd className={`mt-0.5 whitespace-nowrap text-[12.5px] ${accent ? "font-extrabold text-brand" : "font-bold text-content"}`}>{value}</dd>
    </div>
  );
}
