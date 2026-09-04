"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Escudo } from "@/components/brand/Escudo";
import { CloseIcon } from "@/components/ui/Icons";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import { cn } from "@/lib/cn";
import type { NavCategory } from "./Header";

export function MobileMenu({
  categories,
  dreiSlug,
}: {
  categories: NavCategory[];
  dreiSlug: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => close(), [pathname, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de categorías"
        aria-expanded={open}
        className="flex h-10 w-10 flex-none flex-col items-center justify-center gap-[5px] border border-line bg-ink-850 text-content transition-colors hover:border-brand hover:text-brand min-[1340px]:hidden"
      >
        <span className="block h-[2px] w-[18px] bg-current" />
        <span className="block h-[2px] w-[18px] bg-current" />
        <span className="block h-[2px] w-[18px] bg-current" />
      </button>
      <MobileMenuDrawer open={open} onClose={close} categories={categories} dreiSlug={dreiSlug} pathname={pathname} />
    </>
  );
}

function MobileMenuDrawer({
  open,
  onClose,
  categories,
  dreiSlug,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  categories: NavCategory[];
  dreiSlug: string | null;
  pathname: string;
}) {
  const ref = useDialog(open, onClose);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex min-[1340px]:hidden">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de categorías"
          tabIndex={-1}
          className="relative z-10 flex h-full w-[min(88vw,360px)] flex-col border-r border-line bg-ink-900 outline-none animate-fade-in"
        >
          <div className="flex h-[74px] flex-none items-center gap-3 border-b border-line px-5">
            <Escudo width={30} height={36} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg uppercase skew-fast-6">Menú</p>
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-content-dim">Guantearqueros Bolivia</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar menú" className="p-2 text-content-dim hover:text-brand">
              <CloseIcon size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <details className="group" open={pathname === "/"}>
              <summary className={cn(
                "flex min-h-[44px] cursor-pointer list-none items-center justify-between border-l-2 px-3 text-[13.5px] font-extrabold uppercase tracking-[0.07em] marker:hidden [&::-webkit-details-marker]:hidden",
                pathname === "/" ? "border-brand bg-brand/[0.08] text-brand" : "border-transparent text-content",
              )}>
                Inicio
                <span className="-mt-1 mr-1 size-2 rotate-45 border-b border-r border-current transition-transform group-open:mt-1 group-open:rotate-[225deg]" />
              </summary>
              <div className="mb-2 ml-3 border-l border-line-strong pl-3">
                <HomeSectionLink href="/" onClick={onClose}>Inicio</HomeSectionLink>
                <HomeSectionLink href="/#categorias" onClick={onClose}>Categorías</HomeSectionLink>
                <HomeSectionLink href="/#marcas" onClick={onClose}>Marcas</HomeSectionLink>
                <HomeSectionLink href="/#productos" onClick={onClose}>Todos los productos</HomeSectionLink>
                <HomeSectionLink href="/#tiendas-fisicas" onClick={onClose}>Tiendas físicas</HomeSectionLink>
                <HomeSectionLink href="/#contacto" onClick={onClose}>Contacto</HomeSectionLink>
              </div>
            </details>

            <div className="mt-3 border-t border-line-soft pt-2">
              {categories.map((category) => {
                const active = pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`);
                const featured = category.slug === "ofertas" ? "offers" : category.slug === "nuevos" ? "new" : undefined;
                return (
                  <div key={category.slug} className={cn("border-b border-line-soft py-1.5", featured && "border-b-0 py-1")}>
                    <MenuLink href={`/${category.slug}`} active={active} onClick={onClose} featured={featured}>
                      {featured === "offers" ? <span className="mr-0.5 text-sm" aria-hidden>%</span> : null}
                      {featured === "new" ? <span className="size-1.5 bg-[#39BDF8] shadow-[0_0_7px_#39BDF8]" aria-hidden /> : null}
                      <span>{category.name}</span>
                    </MenuLink>
                    {category.children && category.children.length > 0 ? (
                      <div className="mb-2 ml-3 border-l border-line-strong bg-ink-950/35 py-1 pl-2">
                        {category.children.map((child) => (
                          <Link
                            key={child.slug}
                            href={`/${category.slug}/${child.slug}`}
                            onClick={onClose}
                            className={cn(
                              "group/sub flex min-h-10 items-center border-l-2 px-3 py-2 text-[12.5px] font-semibold transition-colors",
                              pathname === `/${category.slug}/${child.slug}`
                                ? "border-brand bg-brand/[0.08] text-brand"
                                : "border-transparent text-content-dim hover:border-brand hover:bg-white/[0.025] hover:text-content",
                            )}
                          >
                            <span className="min-w-0 flex-1">{child.name}</span>
                            <span className="text-brand opacity-0 transition-opacity group-hover/sub:opacity-100" aria-hidden>→</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {dreiSlug ? (
              <Link
                href="/drei"
                onClick={onClose}
                className={cn(
                  "mt-4 flex items-center gap-2.5 border border-drei-line/60 bg-gradient-to-r from-drei/70 to-drei/20 px-4 py-4 text-[13px] font-extrabold uppercase tracking-[0.1em] text-drei-ink clip-slash-sm transition-colors hover:border-drei-line hover:text-white",
                  pathname === "/drei" && "border-drei-line from-drei to-drei/45 text-white shadow-[0_0_22px_rgba(78,143,203,0.16)]",
                )}
              >
                <span className="h-5 w-[3px] bg-drei-line shadow-[0_0_9px_#4E8FCB]" aria-hidden />
                <span>DREI <span className="text-[9px] tracking-[0.16em] text-drei-line">Athletic</span></span>
              </Link>
            ) : null}

          </nav>

          <div className="border-t border-line px-5 py-4 text-[11.5px] leading-relaxed text-content-dim">
            Guantes, indumentaria y accesorios para arqueros. Envíos a toda Bolivia.
          </div>
        </div>
        <button type="button" tabIndex={-1} aria-label="Cerrar menú" onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-[2px] animate-fade-in" />
      </div>
    </Portal>
  );
}

function HomeSectionLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block py-2 text-[12.5px] font-semibold text-content-dim transition-colors hover:text-brand">
      {children}
    </Link>
  );
}

function MenuLink({ href, active, onClick, children, featured }: { href: string; active: boolean; onClick: () => void; children: React.ReactNode; featured?: "offers" | "new" }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] items-center gap-2 border-l-2 px-3 text-[13.5px] font-extrabold uppercase tracking-[0.07em] transition-colors",
        featured === "offers"
          ? "border-brand bg-brand text-ink-950 clip-slash-sm hover:bg-brand-hot"
          : featured === "new"
            ? "border-[#39BDF8] bg-[#39BDF8]/10 text-[#7DD3FC] hover:bg-[#39BDF8]/20 hover:text-white"
            : active
              ? "border-brand bg-brand/[0.08] text-brand"
              : "border-transparent text-content hover:border-brand hover:text-brand",
        active && featured === "offers" && "bg-brand-hot",
        active && featured === "new" && "bg-[#39BDF8]/25 text-white",
      )}
    >
      {children}
    </Link>
  );
}
