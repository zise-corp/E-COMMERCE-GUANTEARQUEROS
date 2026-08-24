"use client";

import { cn } from "@/lib/cn";
import { Portal } from "./Portal";
import { useDialog } from "./useDialog";

/**
 * Panel lateral derecho. 456px en la tienda, 560px en el detalle de pedido del admin.
 * A ancho completo en mobile.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 456,
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useDialog(open, onClose);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex justify-end">
        <button
          type="button"
          aria-label="Cerrar"
          tabIndex={-1}
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-[#040404]/[0.72] backdrop-blur-[2px] animate-fade-in"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : "Panel"}
          tabIndex={-1}
          style={{ width }}
          className={cn(
            "relative flex h-full max-w-full flex-col border-l border-line bg-ink-900 animate-slide-in outline-none",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <div className="truncate font-display text-[22px] uppercase skew-fast">{title}</div>
              {subtitle ? (
                <div className="mt-0.5 text-[11.5px] text-content-dim">{subtitle}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1 text-xl leading-none text-content-dim transition-colors duration-150 hover:text-brand"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

          {footer ? <div className="border-t border-line bg-ink-950">{footer}</div> : null}
        </div>
      </div>
    </Portal>
  );
}
