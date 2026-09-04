import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * DREI Athletic. Nunca en el header global: solo identifica su categoría y su bloque.
 * Usa el archivo oficial entregado por la marca; nunca se recompone con texto.
 */
export function DreiWordmark({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/DREI.png"
      alt="DREI Athletic"
      height={size}
      width={Math.round(size * 2.22)}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ height: size }}
    />
  );
}
