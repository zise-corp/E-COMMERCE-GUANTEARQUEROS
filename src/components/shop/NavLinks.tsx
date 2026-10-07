"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

export function NavLinks({ categories, className }: { categories: NavCategory[]; className?: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Memorizamos para que las referencias sean estables entre renders y los
  // efectos de medición no se reinicien cada vez que React vuelve a correr
  // este componente.
  const regularCategories = useMemo(() => categories.filter((category) => !isProtected(category)), [categories]);
  const protectedCategories = useMemo(() => categories.filter(isProtected), [categories]);

  // Cuántas categorías regulares caben inline antes de mandar el resto al menú
  // "Más categorías". Arranca optimista (todas) y la medición las reduce si
  // no caben. El cálculo depende del ancho real del slot y del ancho real de
  // cada ítem, así que escala a 2, 5 o 20 categorías sin un corte arbitrario.
  const [maxVisible, setMaxVisible] = useState(regularCategories.length);
  const lastMoreWidthRef = useRef<number>(140);
  // Caché de anchos por slug: una vez que una categoría se midió al menos una
  // vez, recordamos su ancho aunque esté dentro de "Más categorías". Sin esto,
  // al reducir el visible count el medidor solo ve 1 ítem y cree que todas las
  // otras caben → oscilación entre todas-visibles y una-visible.
  const widthCacheRef = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const nav = navRef.current;
    const slot = nav?.parentElement;
    const inner = slot?.parentElement; // .shop-header-inner (flex row)
    if (!nav || !slot || !inner) return;

    const measure = () => {
      // El slot cambia de ancho entre modo normal y compact (compact lo
      // vuelve position:absolute + width:max-content). Para no engancharnos a
      // ese valor, calculamos el disponible como lo haría el Header: ancho del
      // inner menos su padding, menos los hermanos visibles del slot (brand +
      // actions; ignoramos el botón hamburguesa porque solo aparece cuando ya
      // estamos en compact y la decisión de volver a non-compact depende de
      // suponer que no está).
      const innerStyle = window.getComputedStyle(inner);
      const padLeft = Number.parseFloat(innerStyle.paddingLeft) || 0;
      const padRight = Number.parseFloat(innerStyle.paddingRight) || 0;
      const outerGap = Number.parseFloat(innerStyle.columnGap) || 0;

      const siblings = (Array.from(inner.children) as HTMLElement[]).filter(
        (el) => el !== slot && !el.classList.contains("shop-header-menu"),
      );
      const siblingsWidth = siblings.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
      const totalItems = siblings.length + 1; // + slot
      const outerGaps = Math.max(0, totalItems - 1) * outerGap;

      const available = inner.clientWidth - padLeft - padRight - siblingsWidth - outerGaps;
      if (available <= 0) return;

      const style = window.getComputedStyle(nav);
      const gap = Number.parseFloat(style.columnGap) || 0;

      let staticWidth = 0;
      let staticCount = 0;

      for (const child of Array.from(nav.children) as HTMLElement[]) {
        const role = child.dataset["navRole"] ?? "static";
        const width = child.getBoundingClientRect().width;
        if (role === "regular") {
          const slug = child.dataset["catSlug"];
          if (slug) widthCacheRef.current.set(slug, width);
        } else if (role === "more") {
          lastMoreWidthRef.current = width;
        } else {
          staticWidth += width;
          staticCount++;
        }
      }

      // Para el cálculo de fit usamos los anchos cacheados de TODAS las
      // categorías regulares (no solo las que están rendereadas ahora). Si
      // alguna no está en caché aún, estimamos con el promedio de las que sí.
      const cached = regularCategories.map((c) => widthCacheRef.current.get(c.slug));
      const knownWidths = cached.filter((w): w is number => w !== undefined);
      const fallback = knownWidths.length > 0
        ? knownWidths.reduce((a, b) => a + b, 0) / knownWidths.length
        : 90;
      const allRegularWidths = cached.map((w) => w ?? fallback);

      const total = regularCategories.length;
      const moreWidth = lastMoreWidthRef.current;

      // Buscamos el mayor N tal que N categorías + (botón "Más" si N < total)
      // sumadas al resto quepan en el slot disponible.
      let fit = 0;
      for (let n = total; n >= 0; n--) {
        const regularSum = allRegularWidths.slice(0, n).reduce((a, b) => a + b, 0);
        const needsMore = n < total;
        const items = staticCount + n + (needsMore ? 1 : 0);
        const gaps = Math.max(0, items - 1) * gap;
        const totalWidth = staticWidth + regularSum + (needsMore ? moreWidth : 0) + gaps;
        if (totalWidth <= available) { fit = n; break; }
      }

      setMaxVisible((prev) => (prev === fit ? prev : fit));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    observer.observe(nav);
    void document.fonts.ready.then(measure);
    measure();

    return () => observer.disconnect();
  }, [regularCategories]);

  const effectiveMaxVisible = Math.min(maxVisible, regularCategories.length);
  const visibleCategories = regularCategories.slice(0, effectiveMaxVisible);
  const overflowCategories = regularCategories.slice(effectiveMaxVisible);

  // Los <details> ("Inicio", "Más categorías") no se cierran solos al tocar
  // fuera ni con Escape: en pantallas táctiles anchas quedaban abiertos, y
  // abiertos mantienen encendido el velo que desenfoca el catálogo.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const closeMenus = () => {
      nav.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => { menu.open = false; });
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !nav.contains(event.target)) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Cualquier navegación (atrás, logo, buscador) cierra los menús abiertos.
  useEffect(() => {
    navRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => { menu.open = false; });
  }, [pathname]);

  return (
    <nav ref={navRef} className={cn(className, "desktop-nav flex-nowrap items-center gap-x-2 min-[1280px]:gap-x-3 min-[1440px]:gap-x-4 2xl:gap-x-6")} aria-label="Navegación principal">
      <details
        ref={detailsRef}
        data-nav-role="static"
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
        <NavCategoryLink key={category.slug} category={category} pathname={pathname} role="regular" />
      ))}

      {overflowCategories.length > 0 ? (
        <MoreCategoriesMenu categories={overflowCategories} pathname={pathname} />
      ) : null}

      {/*
        Separador vertical: marca el límite entre el grupo de categorías
        (texto + "Más categorías") y el grupo de identidad/sistema (DREI,
        Nuevos, Ofertas). Es puramente visual y no se cuenta como ítem.
      */}
      <span
        aria-hidden
        data-nav-role="static"
        className="hidden h-6 w-px bg-white/20 min-[1024px]:block"
      />

      <Link
        href="/drei"
        data-nav-role="static"
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

      {protectedCategories.map((category) => (
        <NavCategoryLink key={category.slug} category={category} pathname={pathname} role="static" />
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
      data-nav-role="more"
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

function NavCategoryLink({
  category,
  pathname,
  role = "regular",
}: {
  category: NavCategory;
  pathname: string;
  role?: "regular" | "static";
}) {
  const [open, setOpen] = useState(false);
  const active = pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`);
  const isOffers = category.slug === "ofertas";
  const isNew = category.slug === "nuevos";

  // Al cambiar de página el menú se cierra aunque el foco o el mouse sigan encima.
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!isOffers && !isNew && category.children && category.children.length > 0) {
    // data-open es lo que enciende el velo del catálogo (globals.css): sigue el
    // estado del menú, no el foco, que se queda en el enlace después del clic.
    return (
      <div
        className="nav-category-group relative"
        data-nav-role={role}
        data-cat-slug={category.slug}
        data-open={open ? "true" : "false"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <Link
          href={`/${category.slug}`}
          onClick={() => setOpen(false)}
          aria-current={pathname === `/${category.slug}` ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-1.5 text-[12px] font-bold uppercase tracking-[0.07em] transition-all",
            active
              ? "border-brand bg-brand/[0.06] text-brand"
              : "border-transparent text-content-muted hover:border-brand hover:bg-white/[0.025] hover:text-content",
          )}
        >
          {category.name}
          <span
            className={cn(
              "-mt-1 size-1.5 rotate-45 border-b border-r border-current transition-transform",
              open && "mt-1 rotate-[225deg]",
            )}
            aria-hidden
          />
        </Link>

        <div className={cn(
          "absolute -left-[18px] top-full z-50 w-[232px] border border-line-strong border-t-brand bg-ink-900 p-1.5 shadow-[0_22px_55px_rgba(0,0,0,0.68)] transition-[opacity,visibility] clip-corner",
          open
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}>
          <Link
            href={`/${category.slug}`}
            onClick={() => setOpen(false)}
            className="group/explore block border-b border-line px-[14px] pb-2 pt-1 transition-colors hover:bg-brand/[0.06] focus-visible:bg-brand/[0.06] focus-visible:outline-none"
          >
            <span className="block text-[9px] font-extrabold uppercase tracking-[0.18em] text-content-dim transition-colors group-hover/explore:text-brand group-focus-visible/explore:text-brand">
              Explorar categoría
            </span>
            <span className="mt-0.5 block font-display text-[20px] uppercase tracking-[0.04em] text-content transition-colors group-hover/explore:text-brand group-focus-visible/explore:text-brand">
              {category.name}
            </span>
          </Link>

          <div className="mt-1 pt-1">
            {category.children.map((child) => {
              const childActive = pathname === `/${category.slug}/${child.slug}`;
              return (
                <Link
                  key={child.slug}
                  href={`/${category.slug}/${child.slug}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center border-l-2 px-3 py-2.5 text-[12.5px] font-semibold transition-colors",
                    childActive
                      ? "border-brand bg-brand/[0.08] text-brand"
                      : "border-transparent text-content-muted hover:border-brand hover:bg-white/[0.025] hover:text-content",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{child.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/${category.slug}`}
      data-nav-role={role}
      data-cat-slug={category.slug}
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
        active && isOffers && "border-brand-hot bg-brand-hot shadow-[0_0_18px_rgba(235,97,28,0.22)]",
        active && isNew && "border-[#7DD3FC] bg-[#39BDF8]/25 text-white shadow-[0_0_18px_rgba(57,189,248,0.16)]",
      )}
    >
      {isOffers ? <span className="text-[11px] font-black" aria-hidden>%</span> : null}
      {isNew ? <span className="size-1.5 bg-[#39BDF8] shadow-[0_0_7px_#39BDF8]" aria-hidden /> : null}
      {category.name}
    </Link>
  );
}
