"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento compartido de modal y drawer: bloquea el scroll del body,
 * cierra con Escape, mueve el foco adentro y lo devuelve al cerrar.
 * El bloqueo cuenta capas para que cerrar un modal encima de un drawer no
 * desbloquee el fondo.
 */
let lockDepth = 0;

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    lockDepth += 1;
    const body = document.body;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (lockDepth === 1) {
      body.dataset["scrollLocked"] = "";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }

    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (!firstEl || !lastEl) return;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      lockDepth = Math.max(0, lockDepth - 1);
      if (lockDepth === 0) {
        delete body.dataset["scrollLocked"];
        body.style.paddingRight = "";
      }
      restoreTo.current?.focus?.();
    };
  }, [open]);

  return ref;
}
