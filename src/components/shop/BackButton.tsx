"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { announceNavigationCancel } from "@/lib/navigation-feedback";

/** Tiempo para que un back() real dispare popstate; si no, no había adónde volver. */
const BACK_TIMEOUT_MS = 600;

/**
 * Vuelve a la pantalla anterior. Se usa el historial en vez de un link fijo para
 * no perder el listado tal como estaba (filtros de marca, talla y precio, y la
 * posición del scroll). Si se entró directo por link compartido no hay historial
 * propio, así que cae a la categoría del producto.
 */
export function BackButton({ fallbackHref, label }: { fallbackHref: string; label: string }) {
  const router = useRouter();

  function goBack() {
    // history.length también cuenta las entradas "hacia adelante" (tras usar
    // atrás del navegador), así que puede haber historial sin página anterior.
    // La Navigation API, donde existe, sabe si la hay y si es de la tienda.
    const navigation = (window as unknown as { navigation?: { canGoBack?: unknown } }).navigation;
    const canGoBack = typeof navigation?.canGoBack === "boolean" ? navigation.canGoBack : window.history.length > 1;
    if (!canGoBack) {
      router.push(fallbackHref);
      return;
    }

    // Sin Navigation API, back() puede no tener adónde ir. El clic ya encendió el
    // loader (data-navigation-loader): si no hubo popstate, se apaga en vez de
    // bloquear la página hasta su failsafe de 15 s.
    let moved = false;
    const onPopState = () => { moved = true; };
    window.addEventListener("popstate", onPopState, { once: true });
    router.back();
    window.setTimeout(() => {
      window.removeEventListener("popstate", onPopState);
      if (!moved) announceNavigationCancel();
    }, BACK_TIMEOUT_MS);
  }

  return (
    <button
      type="button"
      data-navigation-loader
      onClick={goBack}
      className="inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-content-muted transition-colors duration-150 hover:text-brand"
    >
      <ArrowLeftIcon size={15} />
      {label}
    </button>
  );
}
