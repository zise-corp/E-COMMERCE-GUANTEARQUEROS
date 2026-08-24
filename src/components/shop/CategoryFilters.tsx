"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckboxRow, SizeChip } from "@/components/ui/Chip";
import { formatBs } from "@/lib/money";

/**
 * Los filtros viven en la URL: la vista es server-side, el listado se puede
 * compartir y funciona con el botón de atrás. Este componente solo reescribe
 * los search params.
 */
export function CategoryFilters({
  brandNames,
  sizes,
  maxPrice,
}: {
  brandNames: string[];
  sizes: string[];
  maxPrice: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const selectedBrands = params.getAll("marca");
  const selectedSizes = params.getAll("talla");
  const priceParam = Number.parseInt(params.get("hasta") ?? "", 10);
  const activePrice = Number.isFinite(priceParam) ? priceParam : maxPrice;

  // El range se mueve suelto y recién al soltar toca la URL.
  const [priceDraft, setPriceDraft] = useState(activePrice);
  useEffect(() => setPriceDraft(activePrice), [activePrice]);

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const toggle = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll(key);
      next.delete(key);
      const after = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      for (const v of after) next.append(key, v);
      push(next);
    },
    [params, push],
  );

  const setPrice = useCallback(
    (value: number) => {
      const next = new URLSearchParams(params.toString());
      if (value >= maxPrice) next.delete("hasta");
      else next.set("hasta", String(value));
      push(next);
    },
    [params, push, maxPrice],
  );

  const hasFilters = selectedBrands.length > 0 || selectedSizes.length > 0 || activePrice < maxPrice;

  return (
    <aside className="border border-line bg-ink-900 lg:sticky lg:top-[132px]">
      <div className="flex items-center justify-between border-b border-line px-[18px] py-4">
        <h2 className="font-display text-[17px] uppercase tracking-[0.06em]">Filtros</h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => push(new URLSearchParams())}
            className="text-[11px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:text-brand"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {brandNames.length > 0 ? (
        <div className="border-b border-line p-[18px]">
          <h3 className="label-xs mb-3 text-content-dim">Marca</h3>
          <div className="flex flex-col gap-[9px]">
            {brandNames.map((b) => (
              <CheckboxRow
                key={b}
                label={b}
                checked={selectedBrands.includes(b)}
                onToggle={() => toggle("marca", b)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {sizes.length > 0 ? (
        <div className="border-b border-line p-[18px]">
          <h3 className="label-xs mb-3 text-content-dim">Talla</h3>
          <div className="flex flex-wrap gap-[7px]">
            {sizes.map((s) => (
              <SizeChip key={s} active={selectedSizes.includes(s)} onClick={() => toggle("talla", s)}>
                {s}
              </SizeChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="p-[18px]">
        <h3 className="label-xs mb-3 text-content-dim">Precio máximo</h3>
        <input
          type="range"
          min={0}
          max={maxPrice}
          step={10}
          value={priceDraft}
          onChange={(e) => setPriceDraft(Number(e.target.value))}
          onPointerUp={() => setPrice(priceDraft)}
          onKeyUp={() => setPrice(priceDraft)}
          className="w-full accent-brand"
          aria-label="Precio máximo"
        />
        <div className="mt-2 flex justify-between text-xs text-content-muted">
          <span>{formatBs(0)}</span>
          <span className="font-bold text-brand tabular">{formatBs(priceDraft)}</span>
        </div>
      </div>
    </aside>
  );
}
