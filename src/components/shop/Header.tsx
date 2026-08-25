import Link from "next/link";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { CartButton } from "./CartButton";
import { NavLinks } from "./NavLinks";
import { SearchButton } from "./SearchOverlay";
import { MobileMenu } from "./MobileMenu";

export type NavCategory = {
  name: string;
  slug: string;
  children?: { name: string; slug: string }[];
};

/**
 * Header global sticky de 74px. El nav se envuelve antes que salirse:
 * en pantallas chicas baja a su propia fila, nunca hay scroll horizontal.
 */
export function Header({ categories, dreiSlug }: { categories: NavCategory[]; dreiSlug: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-950/[0.92] backdrop-blur-[10px]">
      {/* Tres columnas laterales iguales: el nav del medio queda centrado respecto
          a la pantalla, no respecto al espacio que sobra entre logo y botones
          (que es lo que pasa con un simple flex + ml-auto). */}
      <div className="container-shop flex h-[74px] items-center gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <MobileMenu categories={categories} dreiSlug={dreiSlug} />
        <Link
          href="/"
          className="flex flex-none items-center gap-1"
          aria-label="Guantearqueros Bolivia, inicio"
        >
          <Escudo width={34} height={40} />
          <Wordmark size={22} className="hidden sm:block" />
        </Link>

        <NavLinks
          categories={categories}
          dreiSlug={dreiSlug}
          className="hidden min-w-0 justify-center lg:flex"
        />

        <div className="ml-auto flex flex-none items-center gap-2.5">
          <SearchButton />
          <CartButton />
        </div>
      </div>

    </header>
  );
}
