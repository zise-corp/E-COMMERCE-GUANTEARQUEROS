import Link from "next/link";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { CartButton } from "./CartButton";
import { SearchButton } from "./SearchOverlay";

export type NavCategory = { name: string; slug: string };

/**
 * Header global sticky de 74px. El nav se envuelve antes que salirse:
 * en pantallas chicas baja a su propia fila, nunca hay scroll horizontal.
 */
export function Header({ categories, dreiSlug }: { categories: NavCategory[]; dreiSlug: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-950/[0.92] backdrop-blur-[10px]">
      <div className="container-shop flex h-[74px] items-center gap-6">
        <Link
          href="/"
          className="flex flex-none items-center gap-3"
          aria-label="Guantearqueros Bolivia, inicio"
        >
          <Escudo width={34} height={40} />
          <Wordmark size={22} className="hidden sm:block" />
        </Link>

        <NavLinks categories={categories} dreiSlug={dreiSlug} className="hidden min-w-0 flex-1 lg:flex" />

        <div className="ml-auto flex flex-none items-center gap-2.5">
          <SearchButton />
          <CartButton />
        </div>
      </div>

      <div className="border-t border-line-soft lg:hidden">
        <NavLinks
          categories={categories}
          dreiSlug={dreiSlug}
          className="container-shop flex py-2"
        />
      </div>
    </header>
  );
}

function NavLinks({
  categories,
  dreiSlug,
  className,
}: {
  categories: NavCategory[];
  dreiSlug: string | null;
  className?: string;
}) {
  return (
    <nav className={`${className ?? ""} flex-wrap items-center gap-x-3.5 gap-y-0.5`}>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/c/${c.slug}`}
          className="whitespace-nowrap border-b-2 border-transparent py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors duration-150 hover:border-brand hover:text-brand"
        >
          {c.name}
        </Link>
      ))}
      {dreiSlug ? (
        <Link
          href={`/c/${dreiSlug}`}
          className="flex items-center gap-[7px] whitespace-nowrap border-b-2 border-transparent py-1.5 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors duration-150 hover:border-drei-line hover:text-drei-line"
        >
          <span className="block h-[7px] w-[7px] bg-drei-line" aria-hidden />
          DREI
        </Link>
      ) : null}
    </nav>
  );
}
