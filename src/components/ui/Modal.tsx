"use client";

import { cn } from "@/lib/cn";
import { Portal } from "./Portal";
import { useDialog } from "./useDialog";

export function Modal({
  open,
  onClose,
  title,
  description,
  width = 440,
  accent = false,
  showClose = true,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: number;
  /** Borde naranja: se usa en la confirmación de pedido. */
  accent?: boolean;
  showClose?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useDialog(open, onClose);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
        <button
          type="button"
          aria-label="Cerrar"
          tabIndex={-1}
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-[#040404]/80 animate-fade-in"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          style={{ width }}
          className={cn(
            "relative max-h-[90dvh] w-full max-w-full overflow-y-auto bg-ink-900 p-7 animate-rise outline-none",
            accent ? "border border-brand" : "border border-line",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl uppercase skew-fast">{title}</h2>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1 -mt-1 p-1 text-lg leading-none text-content-dim transition-colors duration-150 hover:text-brand"
              >
                ✕
              </button>
            ) : null}
          </div>
          {description ? (
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-content-muted">{description}</p>
          ) : null}
          <div className={description ? "mt-[18px]" : "mt-4"}>{children}</div>
        </div>
      </div>
    </Portal>
  );
}
