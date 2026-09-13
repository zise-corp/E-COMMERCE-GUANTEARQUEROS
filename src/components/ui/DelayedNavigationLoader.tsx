"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NAVIGATION_CANCEL_EVENT, NAVIGATION_START_EVENT } from "@/lib/navigation-feedback";

const APPEAR_AFTER_MS = 420;
const MINIMUM_VISIBLE_MS = 280;
const FAILSAFE_MS = 15_000;
type TimerRef = { current: ReturnType<typeof setTimeout> | null };

function navigationElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest("a[href], [data-navigation-loader], [data-payment-destination]");
}

function isCurrentPageNavigation(element: Element) {
  let destinationHref: string | null;
  if (element instanceof HTMLAnchorElement) {
    if (element.target && element.target !== "_self") return false;
    if (element.hasAttribute("download")) return false;
    destinationHref = element.href;
  } else {
    destinationHref = element.getAttribute("data-payment-destination");
    // Sin destino declarado (volver atrás en el historial) siempre hay navegación.
    if (!destinationHref) return element.hasAttribute("data-navigation-loader");
  }

  const destination = new URL(destinationHref, window.location.href);
  if (!["http:", "https:"].includes(destination.protocol)) return false;

  // Un destino igual a la página actual no cambia la ruta: el velo quedaría
  // bloqueando la pantalla hasta el failsafe (p. ej. "Continuar" del carrito
  // estando ya en /checkout/envio).
  const current = new URL(window.location.href);
  return destination.origin !== current.origin
    || destination.pathname !== current.pathname
    || destination.search !== current.search;
}

export function DelayedNavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRoute = useRef(routeKey);
  const pending = useRef(false);
  const visibleRef = useRef(false);
  const shownAt = useRef(0);
  const appearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const clearTimer = useCallback((timer: TimerRef) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const finish = useCallback(() => {
    pending.current = false;
    clearTimer(appearTimer);
    clearTimer(failsafeTimer);

    if (!visibleRef.current) return;
    const remaining = Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - shownAt.current));
    clearTimer(hideTimer);
    hideTimer.current = setTimeout(() => {
      visibleRef.current = false;
      setVisible(false);
    }, remaining);
  }, [clearTimer]);

  const begin = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    clearTimer(hideTimer);
    appearTimer.current = setTimeout(() => {
      if (!pending.current) return;
      shownAt.current = performance.now();
      visibleRef.current = true;
      setVisible(true);
    }, APPEAR_AFTER_MS);
    failsafeTimer.current = setTimeout(finish, FAILSAFE_MS);
  }, [clearTimer, finish]);

  useEffect(() => {
    if (previousRoute.current === routeKey) return;
    previousRoute.current = routeKey;
    finish();
  }, [finish, routeKey]);

  useEffect(() => {
    const blockRepeatedNavigation = (event: MouseEvent) => {
      if (!pending.current) return;
      const element = navigationElement(event.target);
      if (!element || !isCurrentPageNavigation(element)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const detectNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = navigationElement(event.target);
      if (element && isCurrentPageNavigation(element)) begin();
    };

    const handleProgrammaticNavigation = () => begin();
    // Quien anunció una navegación que al final no ocurrió (BackButton sin
    // página anterior) apaga el velo en vez de dejarlo hasta el failsafe.
    const handleNavigationCancel = () => finish();
    // En React 19 un "atrás"/"adelante" puede pintarse de forma síncrona antes
    // de que llegue este listener: si la ruta ya está en pantalla no hay nada
    // que esperar (tampoco en un cambio de solo #hash). Sin este chequeo el velo
    // quedaba bloqueando la página hasta el failsafe de 15 s.
    const handleHistoryNavigation = () => {
      const target = `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;
      if (target !== previousRoute.current) begin();
    };
    const handlePageShow = () => finish();

    document.addEventListener("click", blockRepeatedNavigation, true);
    document.addEventListener("click", detectNavigation);
    window.addEventListener(NAVIGATION_START_EVENT, handleProgrammaticNavigation);
    window.addEventListener(NAVIGATION_CANCEL_EVENT, handleNavigationCancel);
    window.addEventListener("popstate", handleHistoryNavigation);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", blockRepeatedNavigation, true);
      document.removeEventListener("click", detectNavigation);
      window.removeEventListener(NAVIGATION_START_EVENT, handleProgrammaticNavigation);
      window.removeEventListener(NAVIGATION_CANCEL_EVENT, handleNavigationCancel);
      window.removeEventListener("popstate", handleHistoryNavigation);
      window.removeEventListener("pageshow", handlePageShow);
      clearTimer(appearTimer);
      clearTimer(hideTimer);
      clearTimer(failsafeTimer);
    };
  }, [begin, clearTimer, finish]);

  if (!visible) return null;

  return (
    <div className="route-wait" role="status" aria-live="polite" aria-label="Cargando contenido">
      <span className="route-wait__assembly" aria-hidden="true">
        <span className="route-wait__loader" />
      </span>
    </div>
  );
}
