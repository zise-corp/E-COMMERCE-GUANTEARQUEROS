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
        className="flex h-10 w-10 flex-none flex-col items-center justify-center gap-[5px] border border-line bg-ink-850 text-content transition-colors hover:border-brand hover:text-brand lg:hidden"
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
      <div className="fixed inset-0 z-[90] flex lg:hidden">
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
              <p className="font-display text-lg uppercase skew-fast-6">Categorías</p>
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-content-dim">Guantearqueros Bolivia</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar menú" className="p-2 text-content-dim hover:text-brand">
              <CloseIcon size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <MenuLink href="/" active={pathname === "/"} onClick={onClose}>Inicio · Todos los productos</MenuLink>

            <div className="mt-3 border-t border-line-soft pt-2">
              {categories.map((category) => {
                const active = pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`);
                return (
                  <div key={category.slug} className="border-b border-line-soft py-1.5">
                    <MenuLink href={`/${category.slug}`} active={active} onClick={onClose}>
                      {category.name}
                    </MenuLink>
                    {category.children && category.children.length > 0 ? (
                      <div className="mb-1 ml-3 border-l border-line-strong pl-3">
                        {category.children.map((child) => (
                          <Link
                            key={child.slug}
                            href={`/${category.slug}/${child.slug}`}
                            onClick={onClose}
                            className={cn(
                              "block py-2 text-[12.5px] font-semibold text-content-dim transition-colors hover:text-brand",
                              pathname === `/${category.slug}/${child.slug}` && "text-brand",
                            )}
                          >
                            {child.name}
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
                  "mt-4 flex items-center gap-2 border border-drei-line/50 bg-drei/30 px-4 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.1em] text-drei-ink",
                  pathname === "/drei" && "border-drei-line bg-drei/60",
                )}
              >
                <span className="h-2 w-2 bg-drei-line" />
                DREI Athletic
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

function MenuLink({ href, active, onClick, children }: { href: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] items-center border-l-2 px-3 text-[13.5px] font-extrabold uppercase tracking-[0.07em] transition-colors",
        active ? "border-brand bg-brand/[0.08] text-brand" : "border-transparent text-content hover:border-brand hover:text-brand",
      )}
    >
      {children}
    </Link>
  );
}
