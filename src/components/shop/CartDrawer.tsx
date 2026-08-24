"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatBs, toNumber } from "@/lib/money";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";
import {
  ShippingForm,
  describeDelivery,
  emptyShipping,
  validate,
  type ShippingValues,
} from "./ShippingForm";
import { ConfirmOrderModal } from "./ConfirmOrderModal";

export function CartDrawer() {
  const cart = useCart();
  const [shipping, setShipping] = useState<ShippingValues>(emptyShipping);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const title = cart.step === "items" ? "Tu carrito" : "Datos de envío";
  const ctaLabel = cart.step === "items" ? "Continuar" : "Revisar y confirmar";
  const empty = cart.items.length === 0;

  const onCta = useCallback(() => {
    if (cart.step === "items") {
      cart.setStep("shipping");
      return;
    }
    setSubmitAttempted(true);
    // La validación vive en ShippingForm; acá solo se abre el resumen si pasó.
    if (validate(shipping).ok) setConfirmOpen(true);
  }, [cart, shipping]);

  return (
    <>
      <Drawer
        open={cart.open}
        onClose={cart.closeCart}
        title={title}
        footer={
          <div className="px-6 pb-[22px] pt-[18px]">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="label-xs text-content-dim">Subtotal</span>
              <span className="font-display text-[30px] leading-none text-brand tabular">
                {formatBs(cart.subtotal)}
              </span>
            </div>
            <p className="mb-3.5 text-xs text-content-dim">{describeDelivery(shipping)}</p>
            <button
              type="button"
              onClick={onCta}
              disabled={empty}
              className="w-full bg-brand px-4 py-[18px] text-center text-[13.5px] font-extrabold uppercase tracking-[0.14em] text-ink-950 transition-colors duration-150 clip-slash-lg hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
            >
              {ctaLabel}
            </button>
            {cart.step === "shipping" ? (
              <button
                type="button"
                onClick={() => cart.setStep("items")}
                className="w-full pt-3 text-center text-[11.5px] uppercase tracking-[0.12em] text-content-dim transition-colors duration-150 hover:text-content"
              >
                ← Volver al carrito
              </button>
            ) : null}
          </div>
        }
      >
        {cart.step === "items" ? (
          <ItemsStep />
        ) : (
          <ShippingForm
            value={shipping}
            onChange={setShipping}
            showErrors={submitAttempted}
          />
        )}
      </Drawer>

      <ConfirmOrderModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        shipping={shipping}
      />
    </>
  );
}

function ItemsStep() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="px-6 py-[70px] text-center">
        <p className="text-sm text-content-dim">Tu carrito está vacío.</p>
        <button
          type="button"
          onClick={cart.closeCart}
          className="mt-5 border border-line-strong px-5 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
        >
          Seguir mirando
        </button>
      </div>
    );
  }

  return (
    <ul className="px-6 py-[18px]">
      {cart.items.map((item) => {
        const line = toNumber(item.unitPrice) * item.quantity;
        return (
          <li
            key={`${item.productId}-${item.size ?? "u"}`}
            className="flex gap-3.5 border-b border-ink-800 py-3.5 last:border-b-0"
          >
            <Link
              href={`/p/${item.slug}`}
              onClick={cart.closeCart}
              className="relative block h-[76px] w-[76px] flex-none overflow-hidden bg-ink-950"
            >
              <ProductImage publicId={item.imagePublicId} alt={item.name} preset="thumb" />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="label-xs text-content-dim">{item.brandName ?? "Guantearqueros"}</p>
              <Link
                href={`/p/${item.slug}`}
                onClick={cart.closeCart}
                className="mt-[3px] block text-sm font-bold leading-tight transition-colors duration-150 hover:text-brand"
              >
                {item.name}
              </Link>
              <p className="mt-[3px] text-xs text-content-dim">
                {item.size ? `Talla ${item.size}` : "Único"}
              </p>

              <div className="mt-[9px] flex items-center gap-3.5">
                <QuantityStepper
                  size="sm"
                  value={item.quantity}
                  max={item.stock || 99}
                  onChange={(n) => cart.setQuantity(item.productId, item.size, n)}
                />
                <button
                  type="button"
                  onClick={() => cart.remove(item.productId, item.size)}
                  className="text-[11.5px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:text-alert"
                >
                  Quitar
                </button>
              </div>
            </div>

            <span className="font-display text-[19px] leading-tight text-brand tabular">
              {formatBs(line)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

