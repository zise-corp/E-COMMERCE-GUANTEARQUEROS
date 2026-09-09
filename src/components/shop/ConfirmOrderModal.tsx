"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatBs } from "@/lib/money";
import { useCart } from "./CartProvider";
import type { ShippingValues } from "./ShippingForm";
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
    items: cart.items.map((i) => ({ productId: i.productId, size: i.size, personalization: i.personalization, quantity: i.quantity })),
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
      router.push(`/checkout/pago?pedido=${data.orderId}`);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión y prueba de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const rows: { k: string; v: string }[] = [
    { k: "Ítems", v: `${cart.count} ${cart.count === 1 ? "producto" : "productos"}` },
    ...(shipping.mode === "pickup"
      ? [{ k: "Retiro en el local", v: "Sin costo" }]
      : [{ k: "Envío", v: currentQuote ? formatBs(currentQuote.pricing.shipping) : "—" }]),
    ...(currentQuote && Number(currentQuote.pricing.discount) > 0 ? [{ k: `Descuento · ${currentQuote.pricing.discountCode}`, v: `− ${formatBs(currentQuote.pricing.discount)}` }] : []),
    { k: "Total", v: currentQuote ? formatBs(currentQuote.pricing.total) : "Verificando…" },
    { k: "Cliente", v: `${shipping.name} ${shipping.lastName}`.trim() || "Sin nombre" },
    ...(shipping.invoiceRequested
      ? [
          { k: "Factura", v: "Sí" },
          { k: "Razón Social", v: shipping.businessName },
          { k: "NIT", v: shipping.taxId },
        ]
      : []),
  ];

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Confirmar pedido"
      description="Revisa los datos antes de crear el pedido. Después de confirmar pasás al pago."
      accent
      showClose={false}
    >
      {!currentQuote && !error ? <p role="status" className="mb-4 text-sm text-content-muted">Verificando precios y disponibilidad…</p> : null}
      {currentQuote ? <ul className="mb-4 space-y-2 text-sm">{currentQuote.lines.map((line, i) => <li key={i} className="flex justify-between gap-3"><span>{line.quantity} × {line.name}{line.size ? ` · ${line.size}` : ""}</span><span>{formatBs(Number(line.unitPrice) * line.quantity)}</span></li>)}</ul> : null}
      <dl className="border-t border-ink-800">
        {rows.map((r) => (
          <div
            key={r.k}
            className="flex justify-between gap-4 border-b border-ink-800 py-[11px] text-[13.5px]"
          >
            <dt className="text-content-dim">{r.k}</dt>
            <dd className="text-right font-bold">{r.v}</dd>
          </div>
        ))}
      </dl>

      {error ? (
        <p
          role="alert"
          className="mt-3.5 border-l-[3px] border-alert bg-alert/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-alert-soft"
        >
          {error}
        </p>
      ) : null}
      {!currentQuote && error ? <button type="button" onClick={() => setRefresh((v) => v + 1)} className="mt-3 text-sm font-bold text-brand">Volver a verificar</button> : null}

      <div className="mt-[22px] grid gap-2.5 sm:grid-cols-[1fr_1.4fr]">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="border border-[#3A3A38] px-4 py-[15px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors duration-150 hover:border-content hover:text-content disabled:opacity-50"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={saving || !currentQuote}
          className="flex items-center justify-center gap-2.5 bg-brand px-4 py-[15px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
        >
          {saving ? <Spinner size={16} /> : null}
          {saving ? "Guardando…" : "Sí, confirmar"}
        </button>
      </div>
    </Modal>
  );
}
