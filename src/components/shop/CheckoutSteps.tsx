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
    <ol className="mb-[30px] flex w-full max-w-[600px] items-center" style={arrival}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const completed = n < current;
        const isCurrent = n === current;
        // Línea entre este paso y el siguiente.
        const line = n + 1 < current ? "filled" : n + 1 === current ? "filling" : "empty";
        return (
          <li key={label} className={cn("flex min-w-0 items-center", i < STEPS.length - 1 && "flex-1")}>
            <span className="flex flex-none items-center gap-2 sm:gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "checkout-step-node flex h-7 w-7 items-center justify-center border text-[12px] font-black tabular transition-colors",
                  completed && "border-brand/65 bg-brand/[0.1] text-brand",
                  isCurrent && "checkout-step-current border-brand bg-brand text-ink-950",
                  !completed && !isCurrent && "border-line-strong bg-ink-900 text-content-dim",
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
                  "whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.11em] sm:text-xs sm:tracking-[0.14em]",
                  completed && "text-content-muted max-[380px]:sr-only",
                  isCurrent && "checkout-step-label text-content",
                  !completed && !isCurrent && "text-content-dim",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {label}
                {completed ? <span className="sr-only"> (completado)</span> : null}
              </span>
            </span>
            {i < STEPS.length - 1 ? (
              <span className="relative mx-2 h-px min-w-2 flex-1 overflow-hidden bg-line-strong sm:mx-3 sm:min-w-6" aria-hidden>
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
