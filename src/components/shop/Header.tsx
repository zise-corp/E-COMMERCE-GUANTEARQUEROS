"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { CartButton } from "./CartButton";
import { NavLinks } from "./NavLinks";
import { SearchButton } from "./SearchOverlay";
import { MobileMenu } from "./MobileMenu";

export type NavCategory = {
  name: string;
  slug: string;
  highlighted: boolean;
  children?: { name: string; slug: string }[];
};

/**
 * Header global sticky. Mide el ancho intrínseco de marca, nav y acciones para
 * usar una fila siempre que quepan y dos solamente cuando empezarían a chocar.
 */
export function Header({ categories, dreiSlug }: { categories: NavCategory[]; dreiSlug: string | null }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const navSlotRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const brand = brandRef.current;
    const navSlot = navSlotRef.current;
    const actions = actionsRef.current;
    const nav = navSlot?.querySelector("nav");
    if (!inner || !brand || !nav || !actions) return;

    const desktop = window.matchMedia("(min-width: 1340px)");
    let active = true;

    const measure = () => {
      if (!active || !desktop.matches) {
        if (active) setStacked(false);
        return;
      }

      const innerStyle = window.getComputedStyle(inner);
      const available = inner.clientWidth
        - (Number.parseFloat(innerStyle.paddingLeft) || 0)
        - (Number.parseFloat(innerStyle.paddingRight) || 0);
      const navStyle = window.getComputedStyle(nav);
      const gap = Number.parseFloat(navStyle.columnGap) || 0;
      const items = Array.from(nav.children) as HTMLElement[];
      const navWidth = items.reduce((total, item) => total + item.getBoundingClientRect().width, 0)
        + Math.max(0, items.length - 1) * gap;
      const required = brand.getBoundingClientRect().width
        + actions.getBoundingClientRect().width
        + navWidth
        + 32;

      setStacked(required + 4 > available);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    observer.observe(brand);
    observer.observe(nav);
    observer.observe(actions);
    desktop.addEventListener("change", measure);
    void document.fonts.ready.then(measure);
    measure();

    return () => {
      active = false;
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, [categories, dreiSlug]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-950/[0.92] backdrop-blur-[10px]">
      <div ref={innerRef} className="shop-header-inner" data-stacked={stacked}>
        <MobileMenu categories={categories} dreiSlug={dreiSlug} />
        <Link
          ref={brandRef}
          href="/"
          className="shop-header-brand flex flex-none items-center gap-0"
          aria-label="Guantearqueros Bolivia, inicio"
        >
          <Escudo width={34} height={40} className="h-8 w-[27px] sm:h-10 sm:w-[34px]" />
          <Wordmark size={16} className="ml-[2px] sm:hidden" />
          <Wordmark size={22} className="ml-[2px] hidden sm:block" />
        </Link>

        <div ref={navSlotRef} className="shop-header-nav-slot">
          <NavLinks
            categories={categories}
            dreiSlug={dreiSlug}
            className="shop-header-nav"
          />
        </div>

        <div ref={actionsRef} className="shop-header-actions flex flex-none items-center gap-2.5">
          <SearchButton />
          <CartButton />
        </div>
      </div>

    </header>
  );
}
