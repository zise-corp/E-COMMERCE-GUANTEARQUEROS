"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { Display } from "@/components/ui/Heading";
import { ProductImage } from "./ProductImage";

type HomeCategory = {
  id: number;
  name: string;
  slug: string;
  imagePath: string | null;
  productCount: number;
};

const CAROUSEL_THRESHOLD = 6;

export function CategoryCarousel({ categories }: { categories: HomeCategory[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(categories.length > CAROUSEL_THRESHOLD);
  const isCarousel = categories.length > CAROUSEL_THRESHOLD;

  function updateControls() {
    const track = trackRef.current;
    if (!track) return;
    const end = track.scrollWidth - track.clientWidth;
    setCanGoBack(track.scrollLeft > 2);
    setCanGoForward(track.scrollLeft < end - 2);
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isCarousel) return;
    updateControls();
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    return () => observer.disconnect();
  }, [isCarousel]);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div className={isCarousel ? "relative px-12 sm:px-14" : "relative"}>
      <div
        ref={trackRef}
        onScroll={updateControls}
        className={
          isCarousel
            ? "grid snap-x snap-mandatory grid-flow-col auto-cols-[calc((100%_-_0.875rem)/2)] gap-3.5 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] sm:auto-cols-[calc((100%_-_1.75rem)/3)] lg:auto-cols-[calc((100%_-_4.375rem)/6)] [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-2 gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
        }
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/${category.slug}`}
            className="group relative block aspect-square snap-start overflow-hidden border border-line transition-colors duration-150 clip-corner hover:border-brand"
          >
            <div className="absolute inset-0 opacity-[0.55] transition-opacity duration-200 group-hover:opacity-75">
              <ProductImage publicId={category.imagePath} alt="" preset="category" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 from-[8%] to-ink-950/[0.15] to-[70%]" />
            <div className="absolute inset-x-4 bottom-4">
              <Display as="h3" size="sm" className="text-2xl">
                {category.name}
              </Display>
              <p className="mt-1 text-[11.5px] uppercase tracking-[0.14em] text-brand">
                {category.productCount} {category.productCount === 1 ? "producto" : "productos"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {isCarousel ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between" aria-label="Controles de categorías">
          <div className="pointer-events-auto">
            <CarouselButton label="Ver categorías anteriores" disabled={!canGoBack} onClick={() => move(-1)}>
              <ArrowLeftIcon size={18} />
            </CarouselButton>
          </div>
          <div className="pointer-events-auto">
            <CarouselButton label="Ver más categorías" disabled={!canGoForward} onClick={() => move(1)}>
              <ArrowRightIcon size={18} />
            </CarouselButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CarouselButton({ label, disabled, onClick, children }: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center border border-line-strong bg-ink-950/95 text-content shadow-card backdrop-blur-sm transition-colors hover:border-brand hover:bg-brand hover:text-ink-950 disabled:cursor-default disabled:border-line-soft disabled:text-content-faint disabled:opacity-45 disabled:hover:bg-ink-950/95"
    >
      {children}
    </button>
  );
}
