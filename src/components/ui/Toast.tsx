"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Portal } from "./Portal";

type ToastContext = { show: (message: string) => void };

const Ctx = createContext<ToastContext | null>(null);

/** Toast blanco sobre negro con corte diagonal, 2.2s, abajo a la derecha. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {message ? (
        <Portal>
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-[90] flex items-center gap-3 bg-content px-5 py-3.5 text-ink-950 animate-rise clip-slash-sm"
          >
            <span className="font-display text-base text-brand" aria-hidden>
              ✓
            </span>
            <span className="text-[13px] font-extrabold uppercase tracking-[0.06em]">
              {message}
            </span>
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
