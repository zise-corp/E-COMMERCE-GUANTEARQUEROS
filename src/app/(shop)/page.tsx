import type { Metadata } from "next";
import Link from "next/link";
import { DreiWordmark } from "@/components/brand/DreiWordmark";
import { BrandMarquee } from "@/components/shop/BrandMarquee";
import { HeroStats } from "@/components/shop/HeroStats";
import { ProductGrid } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { Pagination } from "@/components/shop/Pagination";
import { StoreLocations } from "@/components/shop/StoreLocations";
import { ContactSection } from "@/components/shop/ContactSection";
import { CategoryCarousel } from "@/components/shop/CategoryCarousel";
import { HeroCarousel } from "@/components/shop/HeroCarousel";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Heading";
import { ChevronRightIcon } from "@/components/ui/Icons";
import {
  getProductsPage,
  getBrands,
  getCategoryTree,
  getHeroCarouselProducts,
  getCategoryCarouselImages,
  getHomeHeroProduct,
  type HomeHeroProduct,
} from "@/db/queries/catalog";
import { getHomeSettings } from "@/db/queries/settings";

/**
 * DEMO temporal: foto de stock por categoría, para que la home no se vea vacía
 * mientras el catálogo no tiene fotos reales. Va por slug (no por posición del
 * array) porque las categorías se pueden reordenar arrastrando en el admin —
 * si una categoría nueva no está en este mapa, simplemente no muestra foto.
 */
const HERO_IMAGE =
  "https://contents.mediadecathlon.com/p2585609/k$c266853b5915b6b1850da5d51f4b8b9f/guantes-de-arquero-de-futbol-nino-f100-superesist-rojo-azul.jpg";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina } = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(pagina ?? "1", 10) || 1);
  const homeSettings = await getHomeSettings();
  const [categories, productPage, brands, heroProduct, offerProducts, newProducts, categoryProductImages] = await Promise.all([
    getCategoryTree(),
    getProductsPage(requestedPage, 12),
    getBrands(),
    getHomeHeroProduct(homeSettings.heroProductId),
    getHeroCarouselProducts("offers", 6),
    getHeroCarouselProducts("new", 6),
    getCategoryCarouselImages(6),
  ]);

  const heroProducts = homeSettings.heroSource === "new" ? newProducts : offerProducts;

  /* El hero rota la colección elegida en el admin (Ofertas o Nuevos). Si se
     priorizó un producto que pertenece a las seis diapositivas, va primero; el
     resto conserva el orden automático propio de la colección. */
  const heroSlides =
    heroProducts.length > 0
      ? [
          ...heroProducts.filter((p) => p.id === heroProduct?.id),
          ...heroProducts.filter((p) => p.id !== heroProduct?.id),
        ]
      : [];

  const guantes = categories.find((c) => c.slug === "guantes") ?? categories[0];
  const poleras = categories.find((c) => c.slug === "poleras") ?? categories[1];

  return (
    <>
      <Hero
        guantesSlug={guantes?.slug ?? null}
        dreiSlug={poleras?.slug ?? null}
        product={heroProduct}
        slides={heroSlides}
        heroSource={homeSettings.heroSource}
      />

      {categories.length > 0 ? (
        <section id="categorias" className="render-deferred container-shop scroll-mt-28 py-11">
          <SectionHeader
            title="Categorías"
            aside={`${categories.length} ${categories.length === 1 ? "línea activa" : "líneas activas"}`}
          />
          <CategoryCarousel
            categories={categories}
            categoryImages={{
              ...Object.fromEntries(categories.map((category) => [category.slug, categoryProductImages[category.id] ?? []])),
              ofertas: offerProducts.map((product) => product.imagePublicId),
              nuevos: newProducts.map((product) => product.imagePublicId),
            }}
          />
        </section>
      ) : null}

      {brands.length > 0 ? (
        <section id="marcas" className="render-deferred scroll-mt-28 border-y border-line bg-ink-900">
          <BrandMarquee brands={brands} />
        </section>
      ) : null}

      <DreiBlock slug={poleras?.slug ?? null} imagePath={homeSettings.dreiImagePath} />

      <section id="productos" className="render-deferred container-shop scroll-mt-28 py-14">
        <SectionHeader
          title="Todos los productos"
          aside={
            <span className="text-content-dim">
              {productPage.total} {productPage.total === 1 ? "producto" : "productos"}
            </span>
          }
        />
        <ProductGrid
          products={productPage.products}
          columns={4}
          aspect="1/1"
          priorityCount={0}
          emptyMessage="Todavía no hay productos publicados. Agrégalos desde el panel."
        />
        <Pagination page={productPage.page} pageCount={productPage.pageCount} />
      </section>

      <StoreLocations />
      <ContactSection />
    </>
  );
}

function Hero({
  guantesSlug,
  dreiSlug,
  product,
  slides,
  heroSource,
}: {
  guantesSlug: string | null;
  dreiSlug: string | null;
  product: Awaited<ReturnType<typeof getHomeHeroProduct>>;
  slides: HomeHeroProduct[];
  heroSource: "offers" | "new";
}) {
  const price = product ? Number.parseFloat(product.price) : 0;
  const compareAt = product?.compareAtPrice ? Number.parseFloat(product.compareAtPrice) : 0;
  const discount = compareAt > price && price > 0 ? Math.round(((compareAt - price) / compareAt) * 100) : null;
  return (
    /* La columna de texto tenía ~80px de sobra: el título más largo medía menos
       que su columna. Ese espacio se le devuelve a la imagen sin achicar el
       titular. Las dos columnas van en proporciones (fr) y no en píxeles fijos:
       un mínimo en px provoca scroll horizontal apenas la pantalla baja de
       ~1250px, porque el grid deja de poder encogerse. */
    <section className="container-shop grid items-center gap-10 pb-8 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-8 lg:pb-8 lg:pt-8">
      <div className="animate-rise">
        <p className="inline-flex items-center gap-2.5 border border-brand px-3 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[0.18em] text-brand">
          Temporada 2026 · Bolivia
        </p>

        <h1 className="mt-[22px] max-w-[760px] font-display text-[clamp(2.55rem,6.5vw,4.8rem)] uppercase leading-[0.9] tracking-[-0.01em] skew-fast">
          <span className="block text-content">La tienda #1</span>
          <span className="block text-content">de guantes e</span>
          <span className="block text-content">indumentaria para</span>
          <span
            className="block text-brand"
            style={{ textShadow: "0 0 44px rgba(250,42,0,0.45)" }}
          >
            arqueros en Bolivia
          </span>
        </h1>

        <p className="mt-[26px] max-w-[460px] text-[16.5px] leading-relaxed text-content-muted text-pretty">
          Guantes de arquero originales, indumentaria DREI Athletic y accesorios. Envíos a todo el
          país.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {guantesSlug ? (
            <ButtonLink href={`/${guantesSlug}`} size="lg">
              Ver guantes
            </ButtonLink>
          ) : null}
          {dreiSlug ? (
            <ButtonLink href="/drei" variant="outline" size="lg" className="hover:border-drei-line hover:text-drei-line">
              DREI Athletic
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {/* En escritorio el carrusel se estira hasta la altura exacta del bloque
          izquierdo: comienza con la etiqueta de temporada y termina con los
          botones. En móvil conserva su proporción cuadrada. */}
      <div className="relative w-full max-w-[520px] justify-self-center lg:h-full lg:justify-self-end lg:self-stretch">
        <div
          className="absolute inset-[8%_6%] blur-[40px]"
          style={{
            background: "radial-gradient(circle, rgba(250,42,0,0.5), transparent 68%)",
          }}
          aria-hidden
        />
        {slides.length > 0 ? (
          <HeroCarousel products={slides} source={heroSource} />
        ) : product ? (
          <Link
            href={`/p/${product.slug}`}
            aria-label={`Ver producto ${product.name}`}
            className="group relative block aspect-square overflow-hidden border border-line transition-colors hover:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 clip-hero lg:h-full lg:aspect-auto"
          >
            <ProductImage
              publicId={product.imagePublicId}
              alt={product.name}
              preset="square"
              priority
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(200deg, rgba(10,10,10,0) 35%, rgba(10,10,10,0.85) 100%)" }}
              aria-hidden
            />
            <span className="absolute right-0 top-0 bg-brand px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors group-hover:bg-brand-hot">
              Ver producto
            </span>
            {discount ? (
              <p className="absolute bottom-[26px] left-0 bg-alert px-5 py-2.5 pl-[26px] font-display text-xl tracking-[0.04em] text-white skew-fast-8">
                {discount}% OFF
              </p>
            ) : null}
          </Link>
        ) : (
          <div className="relative aspect-square overflow-hidden border border-line clip-hero lg:h-full lg:aspect-auto">
          <ProductImage
            publicId={HERO_IMAGE}
            alt="Guantes de arquero rojos y azules"
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
          </div>
        )}
      </div>

      {/* Las cifras cruzan las dos columnas: dentro de la columna de texto
          terminaban a mitad de la sección y dejaban un hueco a la derecha,
          justo debajo del carrusel. */}
      <div className="lg:col-span-2">
        <HeroStats />
      </div>
    </section>
  );
}

function DreiBlock({ slug, imagePath }: { slug: string | null; imagePath: string | null }) {
  if (!slug) return null;
  return (
    <section id="drei" className="render-deferred container-shop my-16 scroll-mt-28">
      <div
        className="drei-home-card group grid overflow-hidden border border-[#315b80] lg:min-h-[350px] lg:grid-cols-[0.92fr_1.08fr]"
      >
        <div className="relative z-10 flex flex-col justify-center p-8 sm:p-12 lg:pl-14">
          <p className="inline-flex w-fit items-center gap-2 border border-drei-line/40 bg-drei/70 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-drei-ink">
            <span className="h-1.5 w-1.5 bg-drei-line shadow-[0_0_10px_rgba(78,143,203,0.8)]" aria-hidden />
            Marca propia
          </p>
          <DreiWordmark
            size={112}
            className="-ml-4 mt-5 max-w-[250px] [filter:drop-shadow(0_10px_8px_rgba(0,0,0,0.78))_drop-shadow(0_0_16px_rgba(78,143,203,0.2))] sm:-ml-6 sm:max-w-[290px]"
          />
          <p className="mt-5 max-w-[430px] text-[15.5px] leading-relaxed text-[#afc4d7]">
            Uniformes personalizados, camisetas de arquero, calzas y poleras. Producción propia en
            Bolivia.
          </p>
          <ButtonLink href="/drei" variant="drei" className="mt-7 w-fit bg-drei/50 hover:bg-drei-line hover:text-[#07121e]" slash={false}>
            Ver indumentaria
            <ChevronRightIcon size={15} strokeWidth={2} />
          </ButtonLink>
        </div>
        <div className="drei-home-card__visual relative order-first h-[250px] overflow-hidden bg-drei/20 lg:order-none lg:h-auto">
          <ProductImage
            publicId={imagePath}
            alt="Indumentaria DREI Athletic"
            preset="wide"
            className="transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081421]/55 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#0b1c2d] lg:via-[#0b1c2d]/10 lg:to-transparent" aria-hidden />
        </div>
      </div>
    </section>
  );
}
