"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatBs } from "@/lib/money";
import { useCart } from "./CartProvider";
import type { ShippingValues } from "./ShippingForm";

/**
 * Último paso antes de crear el pedido. La orden se crea acá, en el server, y
 * recién con el id confirmado se avanza al pago. Si el cliente vuelve y reenvía
 * en la misma sesión se hace PATCH sobre la misma orden: no se duplica.
 */
export function ConfirmOrderModal({
  open,
  onClose,
  shipping,
  shippingPrice,
  discountCode,
  discountAmount,
}: {
  open: boolean;
  onClose: () => void;
  shipping: ShippingValues;
  shippingPrice: number;
  discountCode: string;
  discountAmount: number;
}) {
  const cart = useCart();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        shipping,
        discountCode,
        items: cart.items.map((i) => ({
          productId: i.productId,
          size: i.size,
          quantity: i.quantity,
        })),
        ...(cart.orderId ? { orderId: cart.orderId } : {}),
      };

      const res = await fetch("/api/orders", {
        method: cart.orderId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as
        | { ok: true; orderId: number; number: number }
        | { ok: false; error: string };

      if (!res.ok || !data.ok) {
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
      router.push("/checkout/pago");
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
      : [{ k: "Envío", v: formatBs(shippingPrice) }]),
    ...(discountAmount > 0 ? [{ k: `Descuento · ${discountCode}`, v: `− ${formatBs(discountAmount)}` }] : []),
    { k: "Total", v: formatBs(Math.max(0, cart.subtotal + shippingPrice - discountAmount)) },
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

      <div className="mt-[22px] grid grid-cols-[1fr_1.4fr] gap-2.5">
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
          disabled={saving}
          className="flex items-center justify-center gap-2.5 bg-brand px-4 py-[15px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
        >
          {saving ? <Spinner size={16} /> : null}
          {saving ? "Guardando…" : "Sí, confirmar"}
        </button>
      </div>
    </Modal>
  );
}
