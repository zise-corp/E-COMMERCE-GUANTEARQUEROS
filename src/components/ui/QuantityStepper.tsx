"use client";

import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  label = "Cantidad",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const dims =
    size === "sm"
      ? { btn: "h-7 w-7 text-sm", num: "w-[26px] text-[13px] font-extrabold" }
      : { btn: "h-14 w-[46px] text-lg", num: "w-11 font-display text-xl" };

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div
      className={cn("flex items-center border border-[#3A3A38]", className)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Quitar uno"
        className={cn(
          "flex items-center justify-center text-content-muted transition-colors duration-150",
          "hover:text-brand disabled:opacity-40 disabled:hover:text-content-muted",
          dims.btn,
        )}
      >
        −
      </button>
      <span className={cn("text-center tabular", dims.num)} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Agregar uno"
        className={cn(
          "flex items-center justify-center text-content-muted transition-colors duration-150",
          "hover:text-brand disabled:opacity-40 disabled:hover:text-content-muted",
          dims.btn,
        )}
      >
        +
      </button>
    </div>
  );
}
