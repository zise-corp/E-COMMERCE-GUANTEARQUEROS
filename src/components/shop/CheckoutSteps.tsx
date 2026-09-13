import { cn } from "@/lib/cn";

const STEPS = ["Envío", "Pago", "Confirmación"] as const;

/**
 * Stepper del checkout. Cada paso es otra página, así que la animación corre al
 * montar (clases en globals.css): la línea que llega al paso actual se llena, el
 * paso recién cumplido dibuja su check y el número actual entra con un rebote y
 * un pulso. Lo de pasos anteriores ya aparece completo para no repetirse.
 */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  // El número actual entra cuando termina de llenarse la línea que conduce a él.
  const arrival = { "--step-delay": current > 1 ? "380ms" : "0ms" } as React.CSSProperties;

  return (
    <ol className="mb-[30px] flex flex-wrap items-center gap-x-4 gap-y-2" style={arrival}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const completed = n < current;
        const isCurrent = n === current;
        // Línea entre este paso y el siguiente.
        const line = n + 1 < current ? "filled" : n + 1 === current ? "filling" : "empty";
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                "flex h-[26px] w-[26px] items-center justify-center text-[12.5px] font-extrabold",
                completed || isCurrent ? "bg-brand text-ink-950" : "bg-ink-800 text-content-dim",
                isCurrent && "checkout-step-current",
              )}
            >
              {completed ? (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
                  <polyline points="3,8.5 6.5,12 13,4.5" className={n === current - 1 ? "checkout-check-draw" : undefined} />
                </svg>
              ) : (
                n
              )}
            </span>
            <span
              className={cn(
                "text-xs font-extrabold uppercase tracking-[0.14em]",
                completed || isCurrent ? "text-content" : "text-content-dim",
                isCurrent && "checkout-step-label",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {label}
              {completed ? <span className="sr-only"> (completado)</span> : null}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="relative ml-1.5 hidden h-[2px] w-[46px] overflow-hidden bg-line-strong sm:block" aria-hidden>
                {line !== "empty" ? (
                  <span className={cn("absolute inset-0 origin-left bg-brand", line === "filling" && "checkout-step-fill")} />
                ) : null}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
