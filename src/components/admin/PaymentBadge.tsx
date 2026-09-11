import { cn } from "@/lib/cn";
import { PAYMENT_STATE_META, type PaymentStateKey } from "@/lib/order-status";

/** Estado del cobro con el mismo formato que el chip de estado del pedido. */
export function PaymentBadge({ state, className }: { state: PaymentStateKey; className?: string }) {
  const meta = PAYMENT_STATE_META[state];
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1.5 px-2.5 py-[5px] text-[11px] font-extrabold uppercase leading-tight tracking-[0.1em]", className)}
      style={{ color: meta.color, background: meta.bg }}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
