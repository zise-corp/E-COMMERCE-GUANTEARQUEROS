"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeHeroProduct } from "@/db/queries/catalog";
import { cn } from "@/lib/cn";
import { ProductImage } from "./ProductImage";

const INTERVALO_MS = 5000;

function descuento(p: HomeHeroProduct): number | null {
  const precio = Number.parseFloat(p.price);
  const antes = p.compareAtPrice ? Number.parseFloat(p.compareAtPrice) : 0;
  if (!(antes > precio) || !(precio > 0)) return null;
  return Math.round(((antes - precio) / antes) * 100);
}

/**
 * Carrusel del hero: rota entre los productos en oferta cada 5 s.
 *
 * Todas las diapositivas se montan a la vez y se cruzan con opacidad, en vez de
 * montar y desmontar: así el navegador ya tiene las imágenes descargadas y el
 * cambio no parpadea.
 *
 * La rotación se detiene sola cuando la pestaña está en segundo plano (no tiene
 * sentido gastar ciclos ahí) y cuando el usuario pasa el mouse o deja el foco
 * encima, para no cambiarle el producto justo cuando iba a hacer clic.
 */
export function HeroCarousel({ products }: { products: HomeHeroProduct[] }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = products.length;

  // El índice vive en un ref para que el intervalo no dependa del estado y no
  // haya que recrearlo en cada cambio.
  const actualRef = useRef(0);
  const avanzar = useCallback(
    (siguiente: number) => {
      const normalizado = ((siguiente % total) + total) % total;
      actualRef.current = normalizado;
      setActual(normalizado);
    },
    [total],
  );

  useEffect(() => {
    if (total <= 1 || pausado) return;

    const id = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      avanzar(actualRef.current + 1);
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [total, pausado, avanzar]);

  if (total === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      aria-roledescription="carrusel"
      aria-label="Productos en oferta"
    >
      <div className="relative aspect-square overflow-hidden border border-line clip-hero">
        {products.map((p, i) => {
          const off = descuento(p);
          const visible = i === actual;
          return (
            <Link
              key={p.id}
              href={`/p/${p.slug}`}
              aria-label={`Ver producto ${p.name}${off ? `, ${off}% de descuento` : ""}`}
              aria-hidden={!visible}
              // Las diapositivas ocultas no deben ser enfocables con el teclado
              // ni clicables: quedan detrás pero seguirían recibiendo el foco.
              tabIndex={visible ? 0 : -1}
              className={cn(
                "group absolute inset-0 block transition-opacity duration-500",
                visible ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <ProductImage
                publicId={p.imagePublicId}
                alt={p.name}
                preset="square"
                // Solo la primera se precarga; el resto no debe competir con
                // el contenido visible al abrir la página.
                priority={i === 0}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(200deg, rgba(10,10,10,0) 35%, rgba(10,10,10,0.85) 100%)",
                }}
                aria-hidden
              />
              <span className="absolute right-0 top-0 bg-brand px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors group-hover:bg-brand-hot">
                Ver producto
              </span>

              <span className="absolute inset-x-0 bottom-0 p-5 pb-[26px]">
                {off ? (
                  <span className="mb-2.5 inline-block bg-alert px-5 py-2.5 pl-[26px] font-display text-xl tracking-[0.04em] text-white skew-fast-8">
                    {off}% OFF
                  </span>
                ) : null}
                <span className="block truncate text-[15px] font-bold text-content">{p.name}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {total > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => avanzar(i)}
              aria-label={`Ver oferta ${i + 1} de ${total}: ${p.name}`}
              aria-current={i === actual}
              className={cn(
                "h-1.5 transition-all duration-300",
                i === actual ? "w-7 bg-brand" : "w-3 bg-line-strong hover:bg-content-dim",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
