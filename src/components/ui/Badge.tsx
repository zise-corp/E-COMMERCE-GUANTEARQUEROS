import { cn } from "@/lib/cn";

/**
 * Rojo `alert` solo acá: descuento, stock bajo y cancelado. Nunca en superficies grandes.
 */
export function DiscountBadge({
  percent,
  size = "md",
  className,
}: {
  percent: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-[13px] py-1 pl-2 pr-3",
    md: "text-[15px] py-[5px] pl-2.5 pr-3.5",
    lg: "text-[22px] py-2 pl-3.5 pr-[22px]",
  } as const;
  return (
    <span
      className={cn(
        "inline-block bg-alert font-display text-white clip-slash-sm",
        sizes[size],
        className,
      )}
    >
      −{percent}%
    </span>
  );
}

export function LowStockBar({ stock, className }: { stock: number; className?: string }) {
  return (
    <div
      className={cn(
        "bg-alert/90 px-2 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-white",
        className,
      )}
    >
      Últimas {stock} unidades
    </div>
  );
}

export function LowStockNote({ stock, className }: { stock: number; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 border-l-[3px] border-alert bg-alert/10 px-3.5 py-2.5",
        className,
      )}
    >
      <span className="block h-2 w-2 bg-alert animate-pulse-hard" aria-hidden />
      <span className="text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-alert-soft">
        Stock bajo · quedan {stock}
      </span>
    </div>
  );
}

export function DreiTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block bg-drei px-2.5 py-[5px] text-[10.5px] font-extrabold tracking-[0.16em] text-drei-ink",
        className,
      )}
    >
      DREI
    </span>
  );
}

type StatusTone = "brand" | "ok" | "warn" | "muted" | "alert";

const tones: Record<StatusTone, string> = {
  brand: "bg-brand/[0.14] text-brand",
  ok: "bg-state-ok/[0.12] text-state-ok",
  warn: "bg-state-warn/[0.13] text-state-warn",
  muted: "bg-[#8A8783]/[0.12] text-[#8A8783]",
  alert: "bg-alert/[0.14] text-alert-soft",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.1em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-brand px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-950",
        className,
      )}
    >
      {children}
    </span>
  );
}
