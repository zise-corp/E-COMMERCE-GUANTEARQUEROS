"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatBs, toNumber } from "@/lib/money";
import { CheckoutSteps } from "./CheckoutSteps";
import { ConfirmOrderModal } from "./ConfirmOrderModal";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";
import {
  ShippingForm,
  describeDelivery,
  emptyShipping,
  validate,
  type ShippingValues,
} from "./ShippingForm";

const SHIPPING_KEY = "gq.shipping.v1";

export function ShippingCheckout({ shippingPrice }: { shippingPrice: number }) {
  const cart = useCart();
  const [shipping, setShipping] = useState<ShippingValues>(emptyShipping);
  const [hydrated, setHydrated] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number; subtotal: number } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const cartImagesSynced = useRef(false);

  useEffect(() => {
    if (!cart.ready || cart.items.length === 0 || cartImagesSynced.current) return;
    cartImagesSynced.current = true;
    void fetch("/api/cart/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: cart.items.map((item) => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        })),
      }),
    })
      .then((response) => response.json())
      .then((data: { ok: boolean; images?: { productId: number; imagePublicId: string | null }[] }) => {
        if (data.ok && data.images) cart.syncImages(data.images);
      })
      .catch(() => undefined);
  }, [cart]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SHIPPING_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ShippingValues>;
        setShipping({ ...emptyShipping, ...parsed });
      }
    } catch {
      window.sessionStorage.removeItem(SHIPPING_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(SHIPPING_KEY, JSON.stringify(shipping));
  }, [shipping, hydrated]);

  function reviewOrder() {
    setShowErrors(true);
    if (validate(shipping).ok) setConfirmOpen(true);
  }

  async function applyCode() {
    if (!code.trim()) return;
    setCheckingCode(true);
    setCodeError(null);
    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          items: cart.items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
        }),
      });
      const data = await response.json() as { ok: true; code: string; discount: string } | { ok: false; error: string };
      if (!response.ok || !data.ok) {
        setDiscount(null);
        setCodeError(data.ok ? "Código inválido." : data.error);
        return;
      }
      setCode(data.code);
      setDiscount({ code: data.code, amount: Number(data.discount), subtotal: cart.subtotal });
    } catch {
      setCodeError("No pudimos validar el código.");
    } finally {
      setCheckingCode(false);
    }
  }

  const activeDiscount = discount?.subtotal === cart.subtotal ? discount : null;
  const effectiveShipping = shipping.mode === "pickup" ? 0 : shippingPrice;
  const total = Math.max(0, cart.subtotal + effectiveShipping - (activeDiscount?.amount ?? 0));

  if (!cart.ready || !hydrated) {
    return <div className="min-h-[55vh]" />;
  }

  if (cart.items.length === 0) {
    return (
      <section className="container-shop py-16 text-center sm:py-24">
        <CheckoutSteps current={1} />
        <h1 className="font-display text-3xl uppercase skew-fast-6">Tu carrito está vacío</h1>
        <p className="mt-3 text-sm text-content-muted">Agrega productos antes de completar el envío.</p>
        <Link
          href="/"
          className="mt-6 inline-block bg-brand px-6 py-4 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot"
        >
          Volver a la tienda
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1160px] px-5 py-8 pb-20 sm:px-8 sm:py-[34px]">
      <CheckoutSteps current={1} />

      <Link
        href="/"
        className="mb-[22px] inline-flex text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors hover:text-brand"
      >
        ← Seguir comprando
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
        <div className="border border-line bg-ink-900">
          <div className="border-b border-line px-6 py-5">
            <h1 className="font-display text-[26px] uppercase skew-fast-6">Datos de envío</h1>
            <p className="mt-1 text-[13px] text-content-muted">
              Indica dónde recibirás tu pedido y cómo podemos contactarte.
            </p>
          </div>
          <ShippingForm value={shipping} onChange={setShipping} showErrors={showErrors} />
          <div className="h-4" aria-hidden />
        </div>

        <aside className="border border-line bg-ink-900 p-5 lg:sticky lg:top-[132px]">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl uppercase skew-fast-6">Resumen del pedido</h2>
            <button
              type="button"
              onClick={() => cart.openCart("items")}
              className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand hover:text-brand-hot"
            >
              Editar
            </button>
          </div>

          <ul>
            {cart.items.map((item) => (
              <li
                key={`${item.productId}-${item.size ?? "u"}`}
                className="flex gap-3 border-b border-ink-800 py-2.5 last:border-b-0"
              >
                <span className="relative block h-[46px] w-[46px] flex-none overflow-hidden bg-ink-950">
                  <ProductImage publicId={item.imagePublicId} alt={item.name} preset="thumb" />
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span className="block font-bold">{item.name}</span>
                  <span className="mt-0.5 block text-content-dim">
                    {item.size ? `Talla ${item.size} · ` : ""}
                    {item.quantity} × {formatBs(item.unitPrice)}
                  </span>
                </span>
                <span className="text-[13.5px] font-extrabold tabular">
                  {formatBs(toNumber(item.unitPrice) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-ink-800 pt-4 text-[13px]">
            <div className="flex justify-between"><span className="text-content-dim">Subtotal</span><span>{formatBs(cart.subtotal)}</span></div>
            {shipping.mode === "pickup" ? (
              <div className="flex justify-between"><span className="text-content-dim">Retiro en el local</span><span className="text-state-ok">Sin costo</span></div>
            ) : (
              <div className="flex justify-between"><span className="text-content-dim">Envío</span><span>{formatBs(shippingPrice)}</span></div>
            )}
            {activeDiscount ? (
              <div className="flex justify-between text-state-ok"><span>Descuento · {activeDiscount.code}</span><span>− {formatBs(activeDiscount.amount)}</span></div>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="label-xs mb-1.5 block text-content-dim">Código de descuento</label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(event) => { setCode(event.target.value.toUpperCase()); setDiscount(null); setCodeError(null); }}
                placeholder="Ingresa tu código"
                className="min-w-0 flex-1 border border-line-strong bg-ink-950 px-3 py-2.5 uppercase outline-none focus:border-brand"
              />
              <button type="button" disabled={!code.trim() || checkingCode} onClick={applyCode} className="border border-brand px-3 text-[11px] font-extrabold uppercase text-brand hover:bg-brand hover:text-ink-950 disabled:opacity-50">
                {checkingCode ? "..." : "Aplicar"}
              </button>
            </div>
            {codeError ? <p className="mt-1.5 text-xs text-alert-soft">{codeError}</p> : null}
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="label-xs text-content-dim">Total</span>
            <span className="font-display text-[34px] leading-none text-brand tabular">{formatBs(total)}</span>
          </div>
          <button
            type="button"
            onClick={reviewOrder}
            className="mt-5 w-full bg-brand px-5 py-[17px] text-[13px] font-extrabold uppercase tracking-[0.13em] text-ink-950 transition-colors hover:bg-brand-hot"
          >
            Revisar y continuar al pago
          </button>
        </aside>
      </div>

      <ConfirmOrderModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        shipping={shipping}
        shippingPrice={effectiveShipping}
        discountCode={activeDiscount?.code ?? ""}
        discountAmount={activeDiscount?.amount ?? 0}
      />
    </section>
  );
}
