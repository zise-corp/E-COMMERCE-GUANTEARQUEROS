"use client";

import { CartIcon } from "@/components/ui/Icons";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => openCart("items")}
      className="relative flex size-[42px] items-center justify-center bg-brand text-ink-950 transition-colors duration-150 hover:bg-brand-hot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      aria-label={`Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}`}
      title="Abrir carrito"
    >
      <CartIcon size={21} strokeWidth={1.9} />
      <span className="absolute -right-1.5 -top-1.5 inline-flex h-[19px] min-w-[19px] items-center justify-center border-2 border-ink-950 bg-content px-1 text-[10px] font-extrabold leading-none text-ink-950 tabular">
        {count}
      </span>
    </button>
  );
}
