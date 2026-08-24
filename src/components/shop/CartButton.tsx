"use client";

import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => openCart("items")}
      className="flex items-center gap-2.5 bg-brand px-4 py-[11px] text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot"
      aria-label={`Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}`}
    >
      <span className="hidden sm:inline">Carrito</span>
      <span className="sm:hidden">Bolsa</span>
      <span className="inline-flex h-5 min-w-5 items-center justify-center bg-ink-950 px-1 text-xs text-brand tabular">
        {count}
      </span>
    </button>
  );
}
