import { cn } from "@/lib/cn";
import { ESCUDO_PATH } from "./escudo-path";

/**
 * Escudo de Guantearqueros. Es el logo real vectorizado del PNG del dueño;
 * en los prototipos estaba simulado con clip-path. Se mantiene el tamaño óptico
 * del handoff: 34×40 en el header, 24×29 en el sidebar del admin.
 *
 * Se inyecta inline (no <img>) para poder teñirlo y para que no parpadee en el
 * header sticky. El gradiente por defecto es el de marca; `tone="solid"` lo pinta
 * plano con `currentColor` cuando el fondo ya es naranja.
 */
export function Escudo({
  width = 34,
  height = 40,
  tone = "brand",
  className,
  title = "Guantearqueros Bolivia",
}: {
  width?: number;
  height?: number;
  tone?: "brand" | "solid";
  className?: string;
  title?: string;
}) {
  const id = `escudo-${tone}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      {tone === "brand" ? (
        <defs>
          <linearGradient id={id} x1="18%" y1="0%" x2="82%" y2="100%">
            <stop offset="0" stopColor="#FA2A00" />
            <stop offset="1" stopColor="#C81F00" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d={ESCUDO_PATH}
        fillRule="evenodd"
        fill={tone === "brand" ? `url(#${id})` : "currentColor"}
      />
    </svg>
  );
}
