"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { NavCategory } from "./Header";

const HOME_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Inicio", href: "/" },
  { label: "Categorías", href: "/#categorias" },
  { label: "Marcas", href: "/#marcas" },
  { label: "Todos los productos", href: "/#productos" },
  { label: "Tiendas físicas", href: "/#tiendas-fisicas" },
  { label: "Contacto", href: "/#contacto" },
];

export function NavLinks({ categories, dreiSlug, className }: { categories: NavCategory[]; dreiSlug: string | null; className?: string }) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const regularCategories = categories.filter((category) => !isProtected(category));
  const visibleCategories = regularCategories.slice(0, 5);
  const overflowCategories = regularCategories.slice(5);

  return (
    <nav className={cn(className, "desktop-nav flex-nowrap items-center gap-x-2 min-[1440px]:gap-x-3 2xl:gap-x-5")} aria-label="Navegación principal">
      <details
        ref={detailsRef}
        className="group relative"
        onMouseEnter={(event) => { event.currentTarget.open = true; }}
        onMouseLeave={(event) => { event.currentTarget.open = false; }}
      >
        <summary className={cn(
          "flex cursor-pointer list-none items-center gap-2 border-b-2 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors marker:hidden [&::-webkit-details-marker]:hidden",
          pathname === "/"
            ? "border-brand text-brand"
            : "border-transparent text-content-muted hover:border-brand hover:text-brand",
        )}>
          Inicio
          <span className="-mt-1 size-2 rotate-45 border-b border-r border-current transition-transform group-open:mt-1 group-open:rotate-[225deg]" aria-hidden />
        </summary>

        <div className="absolute -left-[18px] top-full z-50 w-[220px] border border-line-strong border-t-brand bg-ink-900 p-1.5 shadow-2xl">
          {HOME_LINKS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
              className={cn(
                "flex items-center gap-2 border-l-2 px-3 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-content-muted transition-colors hover:border-brand hover:bg-brand/[0.06] hover:text-brand",
                index === 0 && pathname === "/" ? "border-brand text-brand" : "border-transparent",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </details>

      {visibleCategories.map((category) => (
        <NavCategoryLink key={category.slug} category={category} pathname={pathname} />
      ))}

      {overflowCategories.length > 0 ? (
        <MoreCategoriesMenu categories={overflowCategories} pathname={pathname} />
      ) : null}

      {dreiSlug ? (
        <Link
          href="/drei"
          aria-current={pathname === "/drei" ? "page" : undefined}
          className={cn(
            "group/drei relative flex items-center gap-2 whitespace-nowrap border border-drei-line/55 bg-drei/25 px-3 py-[7px] text-[12px] font-extrabold uppercase tracking-[0.09em] text-drei-ink transition-all duration-200 clip-slash-sm hover:border-drei-line hover:bg-drei/55 hover:text-white",
            pathname === "/drei" && "border-drei-line bg-drei/70 text-white shadow-[0_0_20px_rgba(78,143,203,0.22)]",
          )}
        >
          <span className="block h-3 w-[3px] bg-drei-line shadow-[0_0_8px_#4E8FCB] transition-transform group-hover/drei:scale-y-125" aria-hidden />
          <span>DREI</span>
          <span className="text-[8px] font-bold tracking-[0.16em] text-drei-line">Athletic</span>
        </Link>
      ) : null}

      {categories.filter(isProtected).map((category) => (
        <NavCategoryLink key={category.slug} category={category} pathname={pathname} />
      ))}
    </nav>
  );
}

function MoreCategoriesMenu({ categories, pathname }: { categories: NavCategory[]; pathname: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(categories.filter((category) => pathname.startsWith(`/${category.slug}/`)).map((category) => category.slug)),
  );
  const active = categories.some(
    (category) => pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`),
  );

  return (
    <details
      ref={detailsRef}
      className="group/more relative"
      onMouseEnter={(event) => { event.currentTarget.open = true; }}
      onMouseLeave={(event) => { event.currentTarget.open = false; }}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 whitespace-nowrap border-b-2 px-1 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.07em] transition-colors marker:hidden [&::-webkit-details-marker]:hidden",
          active
            ? "border-brand bg-brand/[0.06] text-brand"
            : "border-transparent text-content-muted hover:border-brand hover:text-content",
        )}
      >
        Más categorías
        <span className="-mt-1 size-1.5 rotate-45 border-b border-r border-current transition-transform group-open/more:mt-1 group-open/more:rotate-[225deg]" aria-hidden />
      </summary>

      <div className="absolute right-0 top-full z-50 max-h-[min(70vh,560px)] w-[270px] overflow-y-auto border border-line-strong border-t-brand bg-ink-900 p-1.5 shadow-[0_24px_64px_rgba(0,0,0,0.72)] clip-corner">
        <div className="border-b border-line px-3 pb-2.5 pt-1.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-content-dim">Catálogo completo</p>
          <p className="mt-0.5 font-display text-xl uppercase tracking-[0.03em] text-content">Más categorías</p>
        </div>

        <div className="mt-1">
          {categories.map((category) => {
            const categoryActive = pathname === `/${category.slug}`;
            const hasChildren = Boolean(category.children && category.children.length > 0);
            const isExpanded = expanded.has(category.slug);
            return (
              <div key={category.slug} className="border-b border-line-soft last:border-0">
                <div className={cn(
                  "flex items-stretch border-l-2 transition-colors",
                  categoryActive
                    ? "border-brand bg-brand/[0.08] text-brand"
                    : "border-transparent text-content hover:border-brand hover:bg-white/[0.025]",
                )}>
                  <Link
                    href={`/${category.slug}`}
                    onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
                    className="flex min-w-0 flex-1 items-center px-3 py-3 text-[12.5px] font-extrabold uppercase tracking-[0.07em]"
                  >
                    {category.name}
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(category.slug)) next.delete(category.slug);
                        else next.add(category.slug);
                        return next;
                      })}
                      aria-expanded={isExpanded}
                      aria-controls={`more-subcategories-${category.slug}`}
                      aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} subcategorías de ${category.name}`}
                    className="group/arrow flex w-10 shrink-0 items-center justify-center border-l border-line-soft text-content-dim transition-colors hover:bg-brand/[0.08] hover:text-brand"
                    >
                      <span className={cn("size-2 rotate-45 border-b border-r border-current transition-transform duration-200", isExpanded && "rotate-[225deg]")} aria-hidden />
                    </button>
                  ) : (
                    <span className="flex w-10 shrink-0 items-center justify-center text-brand opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>→</span>
                  )}
                </div>

                {hasChildren && isExpanded ? (
                  <div id={`more-subcategories-${category.slug}`} className="mb-2 ml-3 border-l border-line-strong bg-ink-950/30 py-1 pl-2 animate-fade-in">
                    {category.children?.map((child) => {
                      const childActive = pathname === `/${category.slug}/${child.slug}`;
                      return (
                        <Link
                          key={child.slug}
                          href={`/${category.slug}/${child.slug}`}
                          onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
                          className={cn(
                            "block border-l-2 px-3 py-2 text-[12px] font-semibold transition-colors",
                            childActive
                              ? "border-brand bg-brand/[0.07] text-brand"
                              : "border-transparent text-content-dim hover:border-brand hover:text-content",
                          )}
                        >
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function isProtected(category: NavCategory) {
  return category.slug === "ofertas" || category.slug === "nuevos";
}

function NavCategoryLink({ category, pathname }: { category: NavCategory; pathname: string }) {
  const active = pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`);
  const isOffers = category.slug === "ofertas";
  const isNew = category.slug === "nuevos";
  const detailsRef = useRef<HTMLDetailsElement>(null);

  if (!isOffers && !isNew && category.children && category.children.length > 0) {
    return (
      <details
        ref={detailsRef}
        className="group/category relative"
        onMouseEnter={(event) => { event.currentTarget.open = true; }}
        onMouseLeave={(event) => { event.currentTarget.open = false; }}
      >
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center gap-2 border-b-2 px-1 py-1.5 text-[12px] font-bold uppercase tracking-[0.07em] transition-all marker:hidden [&::-webkit-details-marker]:hidden",
            active
              ? "border-brand bg-brand/[0.06] text-brand"
              : "border-transparent text-content-muted hover:border-brand hover:bg-white/[0.025] hover:text-content",
          )}
        >
          {category.name}
          <span className="-mt-1 size-1.5 rotate-45 border-b border-r border-current transition-transform group-open/category:mt-1 group-open/category:rotate-[225deg]" aria-hidden />
        </summary>

        <div className="absolute -left-[18px] top-full z-50 w-[232px] border border-line-strong border-t-brand bg-ink-900 p-1.5 shadow-[0_22px_55px_rgba(0,0,0,0.68)] clip-corner">
          <div className="border-b border-line px-[14px] pb-2 pt-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-content-dim">Explorar categoría</p>
            <p className="mt-0.5 font-display text-[20px] uppercase tracking-[0.04em] text-content">{category.name}</p>
          </div>

          <Link
            href={`/${category.slug}`}
            onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
            className={cn(
              "mt-1 flex items-center justify-between border-l-2 px-3 py-2.5 text-[11.5px] font-extrabold uppercase tracking-[0.08em] transition-colors",
              pathname === `/${category.slug}`
                ? "border-brand bg-brand/[0.08] text-brand"
                : "border-transparent text-content hover:border-brand hover:bg-brand/[0.06] hover:text-brand",
            )}
          >
            Ver todo
            <span aria-hidden>→</span>
          </Link>

          <div className="mt-1 border-t border-line-soft pt-1">
            {category.children.map((child) => {
              const childActive = pathname === `/${category.slug}/${child.slug}`;
              return (
                <Link
                  key={child.slug}
                  href={`/${category.slug}/${child.slug}`}
                  onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
                  className={cn(
                    "group/child flex items-center border-l-2 px-3 py-2.5 text-[12.5px] font-semibold transition-colors",
                    childActive
                      ? "border-brand bg-brand/[0.08] text-brand"
                      : "border-transparent text-content-muted hover:border-brand hover:bg-white/[0.025] hover:text-content",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{child.name}</span>
                  <span className="translate-x-1 text-brand opacity-0 transition-all group-hover/child:translate-x-0 group-hover/child:opacity-100" aria-hidden>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </details>
    );
  }

  return (
    <Link
      href={`/${category.slug}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-all duration-200",
        isOffers
          ? "border border-brand bg-brand px-3 text-ink-950 clip-slash-sm hover:border-brand-hot hover:bg-brand-hot"
          : isNew
            ? "border border-[#39BDF8]/65 bg-[#39BDF8]/10 px-3 text-[#7DD3FC] hover:border-[#7DD3FC] hover:bg-[#39BDF8]/20 hover:text-white"
            : active
              ? "border-b-2 border-brand bg-brand/[0.06] px-1 text-brand"
              : "border-b-2 border-transparent px-1 text-content-muted hover:border-brand hover:bg-white/[0.025] hover:text-content",
        active && isOffers && "border-brand-hot bg-brand-hot shadow-[0_0_18px_rgba(250,42,0,0.22)]",
        active && isNew && "border-[#7DD3FC] bg-[#39BDF8]/25 text-white shadow-[0_0_18px_rgba(57,189,248,0.16)]",
      )}
    >
      {isOffers ? <span className="text-[11px] font-black" aria-hidden>%</span> : null}
      {isNew ? <span className="size-1.5 bg-[#39BDF8] shadow-[0_0_7px_#39BDF8]" aria-hidden /> : null}
      {category.name}
    </Link>
  );
}
