"use client";

import { cn } from "@/lib/cn";

/** Chip de filtro: activo = borde naranja + fondo naranja al 12%. */
export function Chip({
  active,
  children,
  className,
  ...rest
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "border px-3 py-2 text-[11.5px] font-bold tracking-[0.06em] transition-colors duration-150",
        active
          ? "border-brand bg-brand/[0.12] text-brand"
          : "border-line-strong bg-transparent text-content-muted hover:border-[#3A3A38] hover:text-content",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Chip de talla: cuadrado, mínimo 40px. Activo relleno naranja en la ficha. */
export function SizeChip({
  active,
  filled,
  children,
  className,
  ...rest
}: {
  active?: boolean;
  /** true en la ficha de producto (fondo naranja), false en el filtro (fondo tenue). */
  filled?: boolean;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "border text-center font-bold transition-colors duration-150",
        filled ? "min-w-[54px] px-3 py-[13px] text-sm" : "min-w-[40px] px-2 py-[9px] text-[13px]",
        active && filled && "border-brand bg-brand text-ink-950",
        active && !filled && "border-brand bg-brand/[0.12] text-brand",
        !active &&
          (filled
            ? "border-[#3A3A38] bg-transparent text-content hover:border-brand hover:text-brand"
            : "border-line-strong bg-transparent text-content-muted hover:border-[#3A3A38] hover:text-content"),
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Checkbox cuadrado de 15px que se llena de naranja. */
export function CheckboxRow({
  checked,
  label,
  onToggle,
  className,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 text-[13.5px] text-content",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "block h-[15px] w-[15px] shrink-0 border transition-colors duration-150",
          checked ? "border-brand bg-brand" : "border-[#3A3A38] bg-transparent",
          "peer-focus-visible:ring-1 peer-focus-visible:ring-brand peer-focus-visible:shadow-focus",
        )}
      />
      {label}
    </label>
  );
}
