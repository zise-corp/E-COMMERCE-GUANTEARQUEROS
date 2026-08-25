import type { Metadata } from "next";
import Link from "next/link";
import { DreiWordmark } from "@/components/brand/DreiWordmark";
import { ProductGrid } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { ButtonLink } from "@/components/ui/Button";
import { Display, SectionHeader } from "@/components/ui/Heading";
import { getBrands, getCategoryTree, getFeaturedProducts } from "@/db/queries/catalog";
import { demoStockPhoto } from "@/lib/images";
import { site } from "@/lib/site";

/**
 * DEMO temporal: foto de stock por categoría, para que la home no se vea vacía
 * mientras el catálogo no tiene fotos reales. Va por slug (no por posición del
 * array) porque las categorías se pueden reordenar arrastrando en el admin —
 * si una categoría nueva no está en este mapa, simplemente no muestra foto.
 */
const CATEGORY_DEMO_PHOTO: Record<string, { keyword: string; lock: number }> = {
  guantes: { keyword: "goalkeeper,gloves", lock: 200 },
  poleras: { keyword: "football,jersey", lock: 201 },
  botas: { keyword: "football,boots", lock: 202 },
  pelotas: { keyword: "soccer,ball", lock: 203 },
  canilleras: { keyword: "shin,guard", lock: 204 },
};

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, featured, brands] = await Promise.all([
    getCategoryTree(),
    getFeaturedProducts(4),
    getBrands(),
  ]);

  const guantes = categories.find((c) => c.slug === "guantes") ?? categories[0];
  const poleras = categories.find((c) => c.slug === "poleras") ?? categories[1];

  return (
    <>
      <Hero guantesSlug={guantes?.slug ?? null} dreiSlug={poleras?.slug ?? null} />

      {categories.length > 0 ? (
        <section className="container-shop py-11">
          <SectionHeader
            title="Categorías"
            aside={`${categories.length} ${categories.length === 1 ? "línea activa" : "líneas activas"}`}
          />
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {categories.map((c) => {
              const demoPhoto = CATEGORY_DEMO_PHOTO[c.slug];
              return (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="group relative block h-[260px] overflow-hidden border border-line transition-colors duration-150 clip-corner hover:border-brand"
              >
                <div className="absolute inset-0 opacity-[0.55] transition-opacity duration-200 group-hover:opacity-75">
                  <ProductImage
                    publicId={demoPhoto ? demoStockPhoto(demoPhoto.keyword, demoPhoto.lock) : null}
                    alt=""
                    preset="category"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 from-[8%] to-ink-950/[0.15] to-[70%]" />
                <div className="absolute inset-x-4 bottom-4">
                  <Display as="h3" size="sm" className="text-2xl">
                    {c.name}
                  </Display>
                  <p className="mt-1 text-[11.5px] uppercase tracking-[0.14em] text-brand">
                    {c.productCount} {c.productCount === 1 ? "producto" : "productos"}
                  </p>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {brands.length > 0 ? (
        <section className="border-y border-line bg-ink-900">
          <div className="container-shop flex flex-wrap items-center justify-between gap-5 py-[26px]">
            {brands.map((b) => (
              <span
                key={b.id}
                className="font-display text-[22px] uppercase tracking-[0.06em] text-[#4A4845] transition-colors duration-150 skew-fast hover:text-content"
              >
                {b.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-shop py-14">
        <SectionHeader
          title="Destacados"
          aside={
            guantes ? (
              <Link href={`/c/${guantes.slug}`} className="text-brand hover:text-brand-hot">
                Ver todo →
              </Link>
            ) : null
          }
        />
        <ProductGrid
          products={featured}
          columns={4}
          aspect="1/1"
          emptyMessage="Todavía no hay productos destacados. Marca algunos desde el panel."
        />
      </section>

      <DreiBlock slug={poleras?.slug ?? null} />
    </>
  );
}

function Hero({ guantesSlug, dreiSlug }: { guantesSlug: string | null; dreiSlug: string | null }) {
  return (
    <section className="container-shop grid items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:pb-10 lg:pt-[72px]">
      <div className="animate-rise">
        <p className="inline-flex items-center gap-2.5 border border-brand px-3 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[0.18em] text-brand">
          Temporada 2026 · Bolivia
        </p>

        <h1 className="mt-[22px] font-display text-[clamp(3.25rem,11vw,6.75rem)] uppercase leading-[0.86] tracking-[-0.01em] skew-fast">
          <span className="block text-content">Acá no</span>
          <span
            className="block text-brand"
            style={{ textShadow: "0 0 44px rgba(250,42,0,0.45)" }}
          >
            pasa nada.
          </span>
        </h1>

        <p className="mt-[26px] max-w-[460px] text-[16.5px] leading-relaxed text-content-muted text-pretty">
          Guantes de arquero originales, indumentaria DREI Athletic y accesorios. Envíos a todo el
          país, retiro en {site.city} el mismo día.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {guantesSlug ? (
            <ButtonLink href={`/c/${guantesSlug}`} size="lg">
              Ver guantes
            </ButtonLink>
          ) : null}
          {dreiSlug ? (
            <ButtonLink href={`/c/${dreiSlug}`} variant="outline" size="lg" className="hover:border-drei-line hover:text-drei-line">
              DREI Athletic
            </ButtonLink>
          ) : null}
        </div>

        <dl className="mt-[46px] flex flex-wrap gap-x-9 gap-y-4 border-t border-line pt-[22px]">
          {[
            { n: "6", label: "Marcas" },
            { n: "24h", label: "Cochabamba" },
            { n: "9", label: "Departamentos" },
          ].map((f) => (
            <div key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="block font-display text-[30px] leading-none text-content">
                  {f.n}
                </span>
                <span className="mt-1 block text-[11.5px] uppercase tracking-[0.14em] text-content-dim">
                  {f.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative">
        <div
          className="absolute inset-[8%_6%] blur-[40px]"
          style={{
            background: "radial-gradient(circle, rgba(250,42,0,0.5), transparent 68%)",
          }}
          aria-hidden
        />
        <div className="relative aspect-square overflow-hidden border border-line clip-hero">
          <ProductImage
            publicId={demoStockPhoto("goalkeeper,save", 7)}
            alt="Guantes de arquero"
            preset="square"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(200deg, rgba(10,10,10,0) 35%, rgba(10,10,10,0.85) 100%)",
            }}
            aria-hidden
          />
          <p className="absolute bottom-[26px] left-0 bg-alert px-5 py-2.5 pl-[26px] font-display text-xl tracking-[0.04em] text-white skew-fast-8">
            Hasta 30% OFF
          </p>
        </div>
      </div>
    </section>
  );
}

function DreiBlock({ slug }: { slug: string | null }) {
  if (!slug) return null;
  return (
    <section className="container-shop mb-16">
      <div
        className="grid items-center overflow-hidden border border-[#234666] lg:grid-cols-[1fr_0.8fr]"
        style={{ background: "linear-gradient(100deg, #10233A 0%, #0D0D0C 62%)" }}
      >
        <div className="p-8 sm:p-12">
          <p className="inline-flex items-center gap-2 bg-drei px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-drei-ink">
            Sub-marca
          </p>
          <DreiWordmark size={56} className="mt-[18px] text-[clamp(2.25rem,6vw,3.5rem)]" />
          <p className="mt-4 max-w-[420px] text-[15.5px] leading-relaxed text-[#9FB4C6]">
            Uniformes personalizados, camisetas de arquero, calzas y poleras. Producción propia en
            Bolivia.
          </p>
          <ButtonLink href={`/c/${slug}`} variant="drei" className="mt-[26px]" slash={false}>
            Ver indumentaria
          </ButtonLink>
        </div>
        <div className="relative h-[220px] bg-drei/20 lg:h-[330px]">
          <ProductImage
            publicId={demoStockPhoto("football,team,jersey", 9)}
            alt="Indumentaria DREI Athletic"
            preset="category"
          />
        </div>
      </div>
    </section>
  );
}
