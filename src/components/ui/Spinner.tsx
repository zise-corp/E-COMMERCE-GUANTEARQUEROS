import { cn } from "@/lib/cn";

/** Spinner de borde superior naranja. 30px por defecto (design system). */
export function Spinner({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "block shrink-0 animate-spin rounded-full border-line-strong border-t-brand",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderWidth: size >= 24 ? 3 : 2,
      }}
    />
  );
}
