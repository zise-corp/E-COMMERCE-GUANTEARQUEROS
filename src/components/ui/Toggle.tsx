"use client";

import { cn } from "@/lib/cn";

/** Interruptor cuadrado 42×22 — nada de píldoras redondeadas. */
export function Toggle({
  checked,
  onChange,
  label,
  id,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="cursor-pointer text-[13px] font-bold text-content">
        {label}
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-[22px] w-[42px] shrink-0 items-center p-[3px] transition-colors duration-150",
          checked ? "justify-end bg-brand" : "justify-start bg-line-strong",
        )}
      >
        <span className="block h-4 w-4 bg-ink-950" aria-hidden />
      </button>
    </div>
  );
}
