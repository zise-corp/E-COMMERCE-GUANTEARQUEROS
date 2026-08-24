import { cn } from "@/lib/cn";

const STEPS = ["Envío", "Pago", "Confirmación"] as const;

/** Stepper del checkout: el número va en cuadro naranja cuando el paso está cumplido. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-[30px] flex flex-wrap items-center gap-x-4 gap-y-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n <= current;
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                "flex h-[26px] w-[26px] items-center justify-center text-[12.5px] font-extrabold",
                done ? "bg-brand text-ink-950" : "bg-ink-800 text-content-dim",
              )}
            >
              {n}
            </span>
            <span
              className={cn(
                "text-xs font-extrabold uppercase tracking-[0.14em]",
                done ? "text-content" : "text-content-dim",
              )}
              aria-current={n === current ? "step" : undefined}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="ml-1.5 hidden h-px w-[46px] bg-line-strong sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
