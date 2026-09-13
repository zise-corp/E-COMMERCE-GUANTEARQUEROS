"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Portal } from "./Portal";

type ToastTone = "success" | "error";
type ToastContext = { show: (message: string, tone?: ToastTone) => void };

const Ctx = createContext<ToastContext | null>(null);

/**
 * Toast blanco sobre negro, 2.2s, arriba al centro. Abajo a la derecha tapaba
 * el botón principal de los paneles laterales ("Continuar" del carrito, que se
 * abre justo al agregar) y el botón de WhatsApp. Es solo informativo: no
 * captura clics, y en mobile deja libres las esquinas (menú, carrito, cerrar).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<ToastTone>("success");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string, nextTone: ToastTone = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    setTone(nextTone);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {message ? (
        <Portal>
          {/* 12px del borde más el notch en celulares que lo tienen. */}
          <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4 pt-[env(safe-area-inset-top)] sm:top-5">
            <div
              role="status"
              aria-live="polite"
              className={`flex max-w-[min(420px,calc(100vw-7rem))] items-center gap-3 border px-5 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.45)] animate-fade-in ${tone === "success" ? "border-state-ok bg-content text-ink-950" : "border-alert bg-ink-900 text-alert-soft"}`}
            >
              <span className={`font-display text-base ${tone === "success" ? "text-brand" : "text-alert"}`} aria-hidden>
                {tone === "success" ? "✓" : "!"}
              </span>
              <span className="text-[13px] font-extrabold uppercase tracking-[0.06em]">
                {message}
              </span>
            </div>
          </div>
        </Portal>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast(): ToastContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast necesita <ToastProvider>");
  return ctx;
}
