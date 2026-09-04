type Brand = {
  id: number;
  name: string;
};

function BrandSequence({ brands, duplicate = false }: { brands: Brand[]; duplicate?: boolean }) {
  return (
    <div className="brand-marquee__sequence" aria-hidden={duplicate || undefined}>
      {brands.map((brand) => (
        <span className="brand-marquee__item" key={`${duplicate ? "copy-" : ""}${brand.id}`}>
          <span>{brand.name}</span>
        </span>
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
