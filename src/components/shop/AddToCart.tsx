"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SizeChip } from "@/components/ui/Chip";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useToast } from "@/components/ui/Toast";
import type { ProductDetail } from "@/db/queries/catalog";
import { useCart } from "./CartProvider";

export function AddToCart({ product }: { product: ProductDetail }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const hasSizes = product.sizes.length > 0;
  const [size, setSize] = useState<string | null>(hasSizes ? (product.sizes[1] ?? product.sizes[0] ?? null) : null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const outOfStock = product.stock <= 0;
  const sizeLabel = product.categorySlug === "guantes" ? "Talla de guante" : "Talla";

  function add(openDrawer: boolean) {
    if (hasSizes && !size) {
      setError("Elige una talla.");
      return;
    }
    setError(null);
    cart.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brandName: product.brandName,
        unitPrice: product.price,
        size,
        imagePublicId: product.imagePublicId,
        stock: product.stock,
      },
      quantity,
    );
    if (openDrawer) {
      cart.openCart("items");
      toast.show("Agregado al carrito");
    } else {
      cart.closeCart();
      router.push("/checkout/envio");
    }
  }

  return (
    <div>
      {hasSizes ? (
        <div className="mt-7">
          <div className="mb-2.5 flex items-baseline justify-between">
            <p className="label-xs text-content-dim">{sizeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <SizeChip
                key={s}
                filled
                active={size === s}
                onClick={() => {
                  setSize(s);
                  setError(null);
                }}
              >
                {s}
              </SizeChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-[26px] flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={Math.max(1, product.stock)}
        />
        <div className="grid flex-1 grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => add(true)}
            disabled={outOfStock}
            className="flex min-h-[52px] items-center justify-center border border-brand px-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand transition-colors hover:bg-brand/10 disabled:border-line disabled:text-content-faint"
          >
            {outOfStock ? "Sin stock" : "Agregar al carrito"}
          </button>
          <button
            type="button"
            onClick={() => add(false)}
            disabled={outOfStock}
            className="flex min-h-[52px] items-center justify-center bg-brand px-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-950 transition-[background-color,box-shadow] clip-slash-lg hover:bg-brand-hot hover:shadow-glow-brand disabled:bg-ink-700 disabled:text-content-faint disabled:shadow-none"
          >
            {outOfStock ? "Sin stock" : "Comprar ahora"}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-alert-soft">
          {error}
        </p>
      ) : null}
    </div>
  );
}
