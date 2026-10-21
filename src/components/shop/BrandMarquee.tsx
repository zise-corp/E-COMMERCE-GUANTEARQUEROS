import Link from "next/link";

type Brand = {
  id: number;
  name: string;
  slug: string;
};

function BrandSequence({ brands, duplicate = false }: { brands: Brand[]; duplicate?: boolean }) {
  return (
    <div className="brand-marquee__sequence" aria-hidden={duplicate || undefined}>
      {brands.map((brand) => (
        <Link
          className="brand-marquee__item"
          href={brand.slug === "drei" ? "/drei" : `/marcas/${brand.slug}`}
          key={`${duplicate ? "copy-" : ""}${brand.id}`}
          tabIndex={duplicate ? -1 : undefined}
        >
          <span>{brand.name}</span>
        </Link>
      ))}
    </div>
  );
}

export function BrandMarquee({ brands }: { brands: Brand[] }) {
  return (
    <div className="brand-marquee" aria-label="Marcas disponibles">
      <div className="brand-marquee__track">
        <BrandSequence brands={brands} />
        <BrandSequence brands={brands} duplicate />
      </div>
    </div>
  );
}
