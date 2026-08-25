"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/ui/Icons";

/**
 * Vuelve a la pantalla anterior. Se usa el historial en vez de un link fijo para
 * no perder el listado tal como estaba (filtros de marca, talla y precio, y la
 * posición del scroll). Si se entró directo por link compartido no hay historial
 * propio, así que cae a la categoría del producto.
 */
export function BackButton({ fallbackHref, label }: { fallbackHref: string; label: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // history.length <= 1 significa que esta es la primera página de la pestaña.
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-content-muted transition-colors duration-150 hover:text-brand"
    >
      <ArrowLeftIcon size={15} />
      {label}
    </button>
  );
}
