"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { CartIcon } from "@/components/ui/Icons";
import type { ProductCard as ProductCardData } from "@/db/queries/catalog";
import { useCart } from "./CartProvider";

/**
 * Agregar al carrito desde la grilla, sin entrar a la ficha.
 *
 * Va como hermano del <Link> de la card (no adentro): un <button> dentro de un
 * <a> es HTML inválido y vuelve el clic impredecible.
 *
 * Con varias tallas no se puede resolver acá: elegir talla es una decisión del
 * cliente y adivinarla llenaría el carrito de devoluciones, así que el botón
 * lleva a la ficha, que es donde está el selector.
 *
 * Con una sola talla (o ninguna) no hay nada que elegir: se agrega directo. Mandar
 * a la ficha para "elegir" entre una única opción sería un paso al vidrio.
 */
export function QuickAddButton({ product }: { product: ProductCardData }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();

  const needsSize = product.sizes.length > 1;
  const onlySize = product.sizes.length === 1 ? (product.sizes[0] ?? null) : null;
  if (product.stock <= 0) return null;

  return (
    <button
      type="button"
      aria-label={
        needsSize ? `Elegir talla de ${product.name}` : `Agregar ${product.name} al carrito`
      }
      title="Agregar al carrito"
      onClick={() => {
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
          size: onlySize,
          imagePublicId: product.imagePublicId,
          stock: product.stock,
        });
        cart.openCart("items");
        toast.show("Agregado al carrito");
      }}
      className={[
        "absolute inset-x-0 bottom-0 z-20 flex h-11 items-center justify-center gap-2",
        // Corte diagonal invertido: sigue el lenguaje angular del resto de la marca.
        "bg-brand text-ink-950",
        "transition-[opacity,transform,background-color] duration-150",
        "hover:bg-brand-hot hover:shadow-glow-brand active:scale-95",
        // En escritorio aparece al pasar el mouse; en táctil siempre visible,
        // porque ahí no existe el hover.
        "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100",
        "max-lg:translate-y-0 max-lg:opacity-100",
      ].join(" ")}
    >
      <CartIcon size={18} />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.11em]">
        Agregar al carrito
      </span>
    </button>
  );
}
