"use client";

import { useState } from "react";
import { DiscountBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { ProductImage } from "./ProductImage";

export function ProductGallery({
  images,
  name,
  discount,
}: {
  images: { publicId: string; alt: string }[];
  name: string;
  discount: number | null;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden border border-line bg-ink-900">
        <div key={active} className="absolute inset-0 animate-rise">
          <ProductImage
            publicId={current?.publicId ?? null}
            alt={current?.alt || name}
            preset="detail"
            priority
          />
        </div>
        {discount !== null ? (
          <DiscountBadge percent={discount} size="lg" className="absolute left-0 top-0" />
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="mt-2.5 grid grid-cols-4 gap-2.5">
          {images.slice(0, 8).map((img, i) => (
            <button
              key={img.publicId}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1} de ${name}`}
              aria-pressed={i === active}
              className={cn(
                "relative aspect-square overflow-hidden border transition-[border-color,opacity] duration-150",
                i === active ? "border-brand opacity-100" : "border-line opacity-[0.55] hover:opacity-100",
              )}
            >
              <ProductImage publicId={img.publicId} alt="" preset="thumb" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
