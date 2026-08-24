import Image from "next/image";
import { brandAssets } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * DREI Athletic. Nunca en el header global: solo identifica su categoría y su bloque.
 * Igual que el wordmark principal, espera el archivo real del dueño.
 */
export function DreiWordmark({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  if (brandAssets.hasDreiSvg) {
    return (
      <Image
        src={brandAssets.dreiSvg}
        alt="DREI Athletic"
        height={size}
        width={size * 4.6}
        className={cn("h-auto w-auto", className)}
        style={{ height: size }}
      />
    );
  }

  return (
    <span
      className={cn("block font-display uppercase leading-[0.92] text-content skew-fast-9", className)}
      style={{ fontSize: size }}
    >
      DREI Athletic
    </span>
  );
}
