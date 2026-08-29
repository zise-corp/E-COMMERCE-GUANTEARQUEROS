"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Drawer } from "@/components/ui/Drawer";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatBs, toNumber } from "@/lib/money";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";

export function CartDrawer() {
  const cart = useCart();
  const router = useRouter();
  const empty = cart.items.length === 0;

  function continueToShipping() {
    cart.closeCart();
    router.push("/checkout/envio");
  }

  return (
      <Drawer
        open={cart.open}
        onClose={cart.closeCart}
        title="Tu carrito"
        footer={
          <div className="px-6 pb-[22px] pt-[18px]">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="label-xs text-content-dim">Subtotal</span>
              <span className="font-display text-[30px] leading-none text-brand tabular">
                {formatBs(cart.subtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={continueToShipping}
              disabled={empty}
              className="w-full bg-brand px-4 py-[18px] text-center text-[13.5px] font-extrabold uppercase tracking-[0.14em] text-ink-950 transition-colors duration-150 clip-slash-lg hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
            >
              Continuar con el envío
            </button>
          </div>
        }
      >
        <ItemsStep />
      </Drawer>
  );
}

function ItemsStep() {
  const cart = useCart();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  function emptyCart() {
    cart.clear();
    cart.setOrderId(null);
    setConfirmEmpty(false);
  }

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
    <>
    <div className="px-6 py-[18px]">
      <div className="flex items-center justify-between border-b border-ink-800 pb-2.5">
        <span className="text-[11.5px] text-content-dim">
          {cart.count} {cart.count === 1 ? "producto" : "productos"}
        </span>
        <button
          type="button"
          onClick={() => setConfirmEmpty(true)}
          className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:text-alert focus-visible:text-alert"
        >
          Vaciar carrito
        </button>
      </div>

      <ul>
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
    </div>
    <ConfirmModal
      open={confirmEmpty}
      title="Vaciar carrito"
      description="¿Quieres quitar todos los productos del carrito?"
      confirmLabel="Vaciar carrito"
      onClose={() => setConfirmEmpty(false)}
      onConfirm={emptyCart}
    />
    </>
  );
}
