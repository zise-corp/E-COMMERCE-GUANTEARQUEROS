"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavCategory } from "./Header";

/**
 * Nav de categorías. Es cliente solo para poder marcar la categoría abierta;
 * el resto del header sigue siendo server component.
 *
 * El nav se envuelve antes que salirse: nunca hay scroll horizontal.
 */
export function NavLinks({
  categories,
  dreiSlug,
  className,
}: {
  categories: NavCategory[];
  dreiSlug: string | null;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn(className, "flex-wrap items-center gap-x-5 gap-y-0.5")}>
      {categories.map((c) => {
        const active = pathname === `/${c.slug}` || pathname.startsWith(`/${c.slug}/`);
        return (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors duration-150",
              active
                ? "border-brand text-brand"
                : "border-transparent hover:border-brand hover:text-brand",
            )}
          >
            {c.name}
          </Link>
        );
      })}

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
    </nav>
  );
}
