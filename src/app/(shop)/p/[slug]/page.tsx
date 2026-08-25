import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/shop/AddToCart";
import { BackButton } from "@/components/shop/BackButton";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { LowStockNote } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { getAllProductSlugs, getProductBySlug } from "@/db/queries/catalog";
import { cloudinaryUrl } from "@/lib/images";
import { discountPercent } from "@/lib/money";
import { site } from "@/lib/site";

export const revalidate = 300;

const LOW_STOCK = 5;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto" };

  const image = product.imagePublicId ? cloudinaryUrl(product.imagePublicId, "og") : undefined;

  return {
    title: product.name,
    description: product.description.slice(0, 160) || site.tagline,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.description.slice(0, 200) || site.tagline,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
  };
}

function sku(id: number) {
  return `GQ-${String(id).padStart(4, "0")}`;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const off = discountPercent(product.price, product.compareAtPrice);
  const low = product.stock > 0 && product.stock <= LOW_STOCK;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: sku(product.id),
    ...(product.brandName ? { brand: { "@type": "Brand", name: product.brandName } } : {}),
    ...(product.imagePublicId
      ? { image: [cloudinaryUrl(product.imagePublicId, "detail")] }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "BOB",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${site.url}/p/${product.slug}`,
      seller: { "@type": "Organization", name: site.name },
    },
  };

  return (
    <section className="container-shop py-8 pb-20 sm:py-[34px]">
      <script
        type="application/ld+json"
        // El contenido es nuestro y ya está serializado: no hay entrada del usuario sin escapar.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="mb-4">
        <BackButton
          fallbackHref={`/${product.categorySlug}`}
          label={`Volver a ${product.categoryName}`}
        />
      </div>

      <nav
        aria-label="Migas de pan"
        className="mb-[22px] text-xs uppercase tracking-[0.12em] text-content-dim"
      >
        <Link href="/" className="transition-colors duration-150 hover:text-brand">
          Inicio
        </Link>
        {" / "}
        <Link
          href={`/${product.categorySlug}`}
          className="transition-colors duration-150 hover:text-brand"
        >
          {product.categoryName}
        </Link>
        {product.subcategorySlug ? (
          <>
            {" / "}
            <Link
              href={`/${product.categorySlug}/${product.subcategorySlug}`}
              className="transition-colors duration-150 hover:text-brand"
            >
              {product.subcategoryName}
            </Link>
          </>
        ) : null}
        {" / "}
        <span className="text-brand">{product.name}</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <ProductGallery
          images={product.images.length > 0 ? product.images : [{ publicId: "", alt: product.name }]}
          name={product.name}
          discount={off}
        />

        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11.5px] font-extrabold uppercase tracking-[0.18em] text-brand">
              {product.brandName ?? "Guantearqueros"}
            </span>
            <span className="block h-1 w-1 bg-[#3A3A38]" aria-hidden />
            <span className="text-[11.5px] uppercase tracking-[0.14em] text-content-dim">
              SKU {sku(product.id)}
            </span>
          </div>

          <h1 className="mt-3.5 font-display text-[clamp(2.25rem,6vw,3.25rem)] uppercase leading-[0.94] skew-fast-6">
            {product.name}
          </h1>

          <div className="mt-6">
            <Price value={product.price} compareAt={product.compareAtPrice} size="xl" />
          </div>

          {low ? <LowStockNote stock={product.stock} className="mt-[18px]" /> : null}

          {product.description ? (
            <p className="mt-[22px] text-[15.5px] leading-relaxed text-content-muted text-pretty">
              {product.description}
            </p>
          ) : null}

          <AddToCart product={product} />

          {product.attributes.length > 0 ? (
            <div className="mt-[34px] border-t border-line">
              <h2 className="label-xs py-[18px] pb-3 text-content-dim">Atributos</h2>
              <dl>
                {product.attributes.map((a, i) => (
                  <div
                    key={`${a.name}-${i}`}
                    className="grid gap-4 border-b border-ink-800 py-[11px] text-sm sm:grid-cols-[190px_1fr]"
                  >
                    <dt className="text-content-dim">{a.name}</dt>
                    <dd className="font-semibold text-content">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
