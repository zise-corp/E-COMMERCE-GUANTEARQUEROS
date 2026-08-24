import Image from "next/image";
import { brandAssets } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * Wordmark "GUANTEARQUEROS": G-U-A-N-T-E en naranja, ARQUEROS en blanco.
 *
 * Pendiente del dueño: el archivo `wordmark-guantearqueros.svg`. Hasta que llegue se
 * compone con Anton exactamente como en el prototipo. Cuando el SVG esté en
 * public/brand/, `brandAssets.hasWordmarkSvg = true` lo reemplaza sin re-tipografiar.
 */
export function Wordmark({
  size = 22,
  withBolivia = false,
  className,
}: {
  size?: number;
  withBolivia?: boolean;
  className?: string;
}) {
  if (brandAssets.hasWordmarkSvg) {
    return (
      <Image
        src={brandAssets.wordmarkSvg}
        alt="Guantearqueros"
        height={size}
        width={size * 7.2}
        priority
        className={cn("h-auto w-auto", className)}
        style={{ height: size }}
      />
    );
  }

  return (
    <span
      className={cn("block font-display uppercase leading-none skew-fast-8", className)}
      style={{ fontSize: size, letterSpacing: "0.01em" }}
    >
      <span className="text-brand">GUANTE</span>
      <span className="text-content">ARQUEROS</span>
      {withBolivia ? <span className="text-content-dim"> BOLIVIA</span> : null}
    </span>
  );
}
