import Link from "next/link";
import { DiscountBadge, DreiTag, LowStockBar } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { cn } from "@/lib/cn";
import { discountPercent } from "@/lib/money";
import type { ProductCard as ProductCardData } from "@/db/queries/catalog";
import { ProductImage } from "./ProductImage";
import { QuickAddButton } from "./QuickAddButton";

const LOW_STOCK = 5;

export function ProductCard({
  product,
  aspect = "4/3",
  priority = false,
}: {
  product: ProductCardData;
  aspect?: "1/1" | "4/3";
  priority?: boolean;
}) {
  const off = discountPercent(product.price, product.compareAtPrice);
  const low = product.stock > 0 && product.stock <= LOW_STOCK;

  return (
    /* El botón de carrito va como HERMANO del link, no adentro: un <button>
       dentro de un <a> es HTML inválido y hace que el clic se comporte distinto
       según el navegador. Con este orden, el link cubre la card y el botón se
       superpone solo en su esquina. */
    <div className="group relative flex flex-col border border-line bg-[#101010] transition-[border-color,box-shadow] duration-150 hover:border-brand hover:shadow-card">
      <div
        className={cn(
          "relative overflow-hidden bg-ink-950",
          aspect === "1/1" ? "aspect-square" : "aspect-[4/3]",
        )}
      >
        <Link href={`/p/${product.slug}`} className="absolute inset-0">
          <ProductImage
            publicId={product.imagePublicId}
            alt={product.name}
            preset={aspect === "1/1" ? "square" : "grid"}
            priority={priority}
          />

          <div className="absolute left-0 top-0 flex flex-col items-start gap-1">
            {product.isNew ? <span className="bg-[#39BDF8] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-ink-950">Nuevo</span> : null}
            {off !== null ? <DiscountBadge percent={off} /> : null}
          </div>

          {product.isDrei ? (
            <DreiTag className="absolute right-2.5 top-2.5" />
          ) : null}

          {low ? (
            <LowStockBar stock={product.stock} className="absolute inset-x-0 top-10" />
          ) : null}

          {product.stock === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70">
              <span className="label-xs border border-line-strong px-3 py-2 text-content-muted">
                Sin stock
              </span>
            </div>
          ) : null}
        </Link>
        <QuickAddButton product={product} />
      </div>

      <Link href={`/p/${product.slug}`} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="label-xs text-content-dim">{product.brandName ?? "Guantearqueros"}</p>
          <h3 className="flex-1 text-[15px] font-bold leading-tight transition-colors duration-150 group-hover:text-brand">
            {product.name}
          </h3>
          <Price value={product.price} compareAt={product.compareAtPrice} size="md" />
        </div>
      </Link>
    </div>
  );
}

export function ProductGrid({
  products,
  columns = 4,
  aspect = "4/3",
  priorityCount = 2,
  emptyMessage = "Ningún producto coincide con los filtros.",
}: {
  products: ProductCardData[];
  columns?: 3 | 4;
  aspect?: "1/1" | "4/3";
  priorityCount?: number;
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-[#3A3A38] p-14 text-center text-sm text-content-dim">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4",
        columns === 4 ? "lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} aspect={aspect} priority={i < priorityCount} />
      ))}
    </div>
  );
}
