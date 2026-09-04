"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { Display } from "@/components/ui/Heading";
import { ProductImage } from "./ProductImage";
import { cn } from "@/lib/cn";

type HomeCategory = {
  id: number;
  name: string;
  slug: string;
  imagePath: string | null;
  productCount: number;
  highlighted: boolean;
};

type CategoryImageMap = Record<string, string[]>;

const CAROUSEL_THRESHOLD = 5;

export function CategoryCarousel({ categories, categoryImages = {} }: { categories: HomeCategory[]; categoryImages?: CategoryImageMap }) {
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
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateControls}
        className={
          isCarousel
            ? "grid snap-x snap-mandatory grid-flow-col auto-cols-[calc((100%_-_0.875rem)/2)] gap-3.5 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] sm:auto-cols-[calc((100%_-_1.75rem)/3)] lg:auto-cols-[calc((100%_-_3.5rem)/5)] [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-2 gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
        }
      >
        {categories.map((category) => {
          const isOffers = category.slug === "ofertas" && category.highlighted;
          const isNew = category.slug === "nuevos" && category.highlighted;
          const rotatingImages = categoryImages[category.slug];
          return <Link
            key={category.id}
            href={`/${category.slug}`}
            className={cn(
              "group relative block aspect-square snap-start overflow-hidden border transition-colors duration-150 clip-corner",
              isOffers
                ? "border-brand bg-brand/[0.08] shadow-[0_0_28px_rgba(250,42,0,0.28)] [--clip-edge-color:#FA2A00] hover:border-brand-hot hover:[--clip-edge-color:#FF4B2B]"
                : isNew
                  ? "border-[#39BDF8] bg-[#39BDF8]/[0.08] shadow-[0_0_28px_rgba(57,189,248,0.2)] [--clip-edge-color:#39BDF8] hover:border-[#7DD3FC] hover:[--clip-edge-color:#7DD3FC]"
                : "border-line hover:border-brand hover:[--clip-edge-color:#FA2A00]",
            )}
          >
            <CategoryImages images={rotatingImages} fallback={category.imagePath} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 from-[8%] to-ink-950/[0.15] to-[70%]" />
            {isOffers ? <span className="absolute left-3 top-3 bg-brand px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-ink-950">Descuentos</span> : null}
            {isNew ? <span className="absolute left-3 top-3 bg-[#39BDF8] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-ink-950">Nuevo</span> : null}
            <div className="absolute inset-x-4 bottom-4">
              <Display as="h3" size="sm" className="text-2xl">
                {category.name}
              </Display>
              <p className="mt-1 text-[11.5px] uppercase tracking-[0.14em] text-brand">
                {category.productCount} {category.productCount === 1 ? "producto" : "productos"}
              </p>
            </div>
          </Link>;
        })}
      </div>

      {isCarousel ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2" aria-label="Controles de categorías">
          <div className="pointer-events-auto">
            <CarouselButton label="Ver categorías anteriores" disabled={!canGoBack} onClick={() => move(-1)}>
              <ChevronLeftIcon size={16} strokeWidth={2} />
            </CarouselButton>
          </div>
          <div className="pointer-events-auto">
            <CarouselButton label="Ver más categorías" disabled={!canGoForward} onClick={() => move(1)}>
              <ChevronRightIcon size={16} strokeWidth={2} />
            </CarouselButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryImages({ images, fallback }: { images?: string[]; fallback: string | null }) {
  const availableImages = images?.length ? images : fallback ? [fallback] : [];
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
    if (availableImages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % availableImages.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [availableImages.length]);

  if (availableImages.length === 0) {
    return (
      <div className="absolute inset-0 opacity-[0.55] transition-opacity duration-200 group-hover:opacity-75">
        <ProductImage publicId={null} alt="" preset="category" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 opacity-[0.55] transition-opacity duration-300 group-hover:opacity-80">
      {availableImages.map((image, index) => (
        <div
          key={`${image}-${index}`}
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-700 ease-out",
            index === activeImage ? "scale-100 opacity-100" : "scale-[1.035] opacity-0",
          )}
          aria-hidden={index !== activeImage}
        >
          <ProductImage publicId={image} alt="" preset="category" />
        </div>
      ))}
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
      className="category-carousel-control flex h-12 w-8 items-center justify-center text-content-dim opacity-50 shadow-card backdrop-blur-md transition-[color,opacity,transform] duration-200 hover:scale-105 hover:text-ink-950 hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
