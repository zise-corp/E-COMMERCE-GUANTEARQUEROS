"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";

const INTRO_DURATION_MS = 1900;

/**
 * Intro global: se monta una vez con el layout de tienda, por lo que vuelve a
 * aparecer al recargar y al volver desde DREI, pero no durante el resto de la
 * navegación interna. DREI conserva su propia presentación azul.
 */
export function StoreIntro() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousPathname.current;
    const isFirstLoad = previous === null;
    const isLeavingDrei = previous === "/drei" && pathname !== "/drei";
    const params = new URLSearchParams(window.location.search);
    const isLeavingAdmin = params.get("intro") === "admin" || window.sessionStorage.getItem("gq:store-intro") === "admin";
    if (isLeavingAdmin) window.sessionStorage.removeItem("gq:store-intro");
    if (params.get("intro") === "admin") {
      params.delete("intro");
      const cleanUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", cleanUrl);
    }
    previousPathname.current = pathname;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }

    if (pathname === "/drei" || (!isFirstLoad && !isLeavingDrei && !isLeavingAdmin)) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), INTRO_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!visible || pathname === "/drei") return null;

  return (
    <div className="store-intro" aria-hidden="true">
      <div className="store-intro__stripes" />
      <div className="store-intro__glow" />
      <div className="store-intro__goal" />
      <div className="store-intro__horizon" />
      <div className="store-intro__scan" />

      <div className="store-intro__identity">
        <div className="store-intro__brand">
          <span className="store-intro__shield">
            <span className="store-intro__pulse" />
            <Escudo width={112} height={112} title="" />
          </span>
          <Wordmark size={76} className="hidden sm:block" />
          <Wordmark size={44} className="sm:hidden" />
        </div>
        <div className="store-intro__rule" />
        <div className="store-intro__loading">
          <span>Preparando el arco</span>
          <span className="store-intro__loading-track"><span /></span>
          <span>Bolivia · Desde 2015</span>
        </div>
      </div>
    </div>
  );
}
