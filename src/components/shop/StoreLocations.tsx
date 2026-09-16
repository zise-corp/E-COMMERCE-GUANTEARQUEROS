"use client";

import { useState } from "react";
import { Display } from "@/components/ui/Heading";
import { ArrowRightIcon, PinIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { STORE_LOCATIONS } from "@/lib/site";

export function StoreLocations() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = STORE_LOCATIONS[selectedIndex]!;
  const coordinates = `${selected.lat},${selected.lng}`;
  const embedUrl = `https://www.google.com/maps?q=${coordinates}&z=17&output=embed`;

  return (
    <section id="tiendas-fisicas" className="render-deferred container-shop mb-16 scroll-mt-28" aria-labelledby="store-locations-title">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="label-xs tracking-[0.18em] text-brand">Tiendas físicas</p>
          <Display id="store-locations-title" as="h2" size="md" className="mt-2">
            Encuentra tu sucursal
          </Display>
        </div>
        <p className="hidden text-xs uppercase tracking-[0.12em] text-content-dim sm:block">
          3 ciudades
        </p>
      </div>

      <div className="grid overflow-hidden border border-line bg-ink-900 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="flex flex-col" role="tablist" aria-label="Sucursales">
          {STORE_LOCATIONS.map((location, index) => {
            const active = index === selectedIndex;
            return (
              <button
                key={location.city}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="store-map"
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "group flex flex-1 gap-4 border-b border-line p-5 text-left transition-colors last:border-b-0 sm:p-6",
                  active ? "bg-brand/[0.08]" : "hover:bg-white/[0.025]",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 flex-none items-center justify-center border transition-colors",
                    active
                      ? "border-brand bg-brand text-ink-950"
                      : "border-line-strong text-content-dim group-hover:border-brand group-hover:text-brand",
                  )}
                >
                  <PinIcon size={18} />
                </span>
                <span className="min-w-0">
                  <span className={cn("font-display text-xl uppercase", active && "text-brand")}>
                    {location.city}
                  </span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-content-faint">
                    {location.short}
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-content-muted">
                    {location.address}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="border-t border-line p-5 sm:p-6">
            <p className="text-xs text-content-faint tabular">{coordinates}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={selected.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-brand px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-brand transition-colors duration-150 hover:bg-brand hover:text-ink-950"
              >
                Cómo llegar
                <ArrowRightIcon size={15} />
              </a>
            </div>
          </div>
        </div>

        <div
          id="store-map"
          role="tabpanel"
          className="relative min-h-[380px] border-t border-line bg-ink-850 lg:min-h-[540px] lg:border-l lg:border-t-0"
        >
          <iframe
            key={selected.city}
            src={embedUrl}
            title={`Mapa de la tienda Guantearqueros en ${selected.city}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0 grayscale-[0.15] contrast-[1.08]"
          />
        </div>
      </div>
    </section>
  );
}
