"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { CartIcon } from "@/components/ui/Icons";
import type { ProductCard as ProductCardData } from "@/db/queries/catalog";
import { useCart } from "./CartProvider";

/**
 * Agregar al carrito desde la grilla, sin entrar a la ficha.
 *
 * Si el producto tiene tallas no se puede resolver acá: elegir talla es una
 * decisión del cliente, y adivinarla llenaría el carrito de devoluciones. En ese
 * caso el botón lleva a la ficha, que es donde está el selector.
 */
export function QuickAddButton({ product }: { product: ProductCardData }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();

  const needsSize = product.sizes.length > 0;
  const outOfStock = product.stock <= 0;

  if (outOfStock) return null;

  return (
    <button
      type="button"
      aria-label={
        needsSize ? `Elegir talla de ${product.name}` : `Agregar ${product.name} al carrito`
      }
      title={needsSize ? "Elegir talla" : "Agregar al carrito"}
      onClick={(e) => {
        // La card entera es un link: sin esto, el clic navegaría a la ficha.
        e.preventDefault();
        e.stopPropagation();

        if (needsSize) {
          router.push(`/p/${product.slug}`);
          return;
        }

        cart.add({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brandName: product.brandName,
          unitPrice: product.price,
          size: null,
          imagePublicId: product.imagePublicId,
          stock: product.stock,
        });
        cart.openCart("items");
        toast.show("Agregado al carrito");
      }}
      className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center bg-brand text-ink-950 opacity-0 shadow-glow-brand transition-[opacity,background-color] duration-150 hover:bg-brand-hot focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
    >
      <CartIcon size={19} />
    </button>
  );
}
