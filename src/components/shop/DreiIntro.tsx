"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const INTRO_DURATION_MS = 1700;

/**
 * Presentación de entrada exclusiva de DREI. El logo se renderiza desde el PNG
 * oficial con object-contain y solo recibe escalado uniforme: nunca se deforma.
 */
export function DreiIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), INTRO_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="drei-intro" aria-hidden="true">
      <div className="drei-intro__grid" />
      <div className="drei-intro__flare" />
      <div className="drei-intro__mark">
        <Image
          src="/brand/DREI.png"
          alt=""
          width={1883}
          height={815}
          priority
          className="h-auto w-full object-contain"
        />
        <span className="drei-intro__rule" />
      </div>
    </div>
  );
}
