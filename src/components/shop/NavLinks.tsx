"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
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

  return (
    <nav className={cn(className, "flex-wrap items-center gap-x-5 gap-y-0.5")} aria-label="Navegación principal">
      <details
        ref={detailsRef}
        className="group relative"
        onMouseEnter={(event) => { event.currentTarget.open = true; }}
        onMouseLeave={(event) => { event.currentTarget.open = false; }}
      >
        <summary className={cn(
          "flex cursor-pointer list-none items-center gap-2 border-b-2 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors marker:hidden [&::-webkit-details-marker]:hidden",
          pathname === "/" ? "border-brand text-brand" : "border-transparent hover:border-brand hover:text-brand",
        )}>
          Inicio
          <span className="-mt-1 size-2 rotate-45 border-b border-r border-current transition-transform group-open:mt-1 group-open:rotate-[225deg]" aria-hidden />
        </summary>

        <div className="absolute left-1/2 top-full z-50 w-[250px] -translate-x-1/2 border border-line-strong bg-ink-900 p-2 shadow-2xl">
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

      {categories.filter((category) => !isProtected(category)).map((category) => (
        <NavCategoryLink key={category.slug} category={category} pathname={pathname} />
      ))}

      {dreiSlug ? (
        <Link
          href="/drei"
          aria-current={pathname === "/drei" ? "page" : undefined}
          className={cn(
            "flex items-center gap-[7px] whitespace-nowrap border-b-2 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors duration-150 hover:border-drei-line hover:text-drei-line",
            pathname === "/drei" ? "border-drei-line text-drei-line" : "border-transparent",
          )}
        >
          <span className="block h-[7px] w-[7px] bg-drei-line" aria-hidden />
          DREI
        </Link>
      ) : null}

      {categories.filter(isProtected).map((category) => (
        <NavCategoryLink key={category.slug} category={category} pathname={pathname} />
      ))}
    </nav>
  );
}

function isProtected(category: NavCategory) {
  return category.slug === "ofertas" || category.slug === "nuevos";
}

function NavCategoryLink({ category, pathname }: { category: NavCategory; pathname: string }) {
  const active = pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`);
  return (
    <Link
      href={`/${category.slug}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap border-b-2 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors duration-150",
        category.highlighted && category.slug === "ofertas"
          ? "border-brand bg-brand px-2.5 text-ink-950 hover:bg-brand-hot"
          : category.highlighted && category.slug === "nuevos"
            ? "border-[#39BDF8] bg-[#39BDF8] px-2.5 text-ink-950 hover:bg-[#7DD3FC]"
            : active ? "border-brand text-brand" : "border-transparent hover:border-brand hover:text-brand",
      )}
    >
      {category.name}
    </Link>
  );
}
