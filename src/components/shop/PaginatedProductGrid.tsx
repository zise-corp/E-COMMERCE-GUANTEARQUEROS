"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductCard as ProductCardData } from "@/db/queries/catalog";
import { ProductGrid } from "./ProductCard";

const PAGE_SIZE = 18;

export function PaginatedProductGrid({ products }: { products: ProductCardData[] }) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => setPage(1), [products]);

  function change(next: number) {
    setPage(Math.min(pages, Math.max(1, next)));
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div ref={topRef} className="min-w-0 scroll-mt-28">
      <ProductGrid products={visible} columns={3} aspect="4/3" />
      {pages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginación de productos">
          <PageButton disabled={safePage === 1} onClick={() => change(safePage - 1)}>Anterior</PageButton>
          <span className="px-2 text-[11px] uppercase tracking-[0.1em] text-content-dim tabular">{safePage} / {pages}</span>
          <PageButton disabled={safePage === pages} onClick={() => change(safePage + 1)}>Siguiente</PageButton>
        </nav>
      ) : null}
    </div>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="min-h-10 border border-line-strong px-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-content-muted transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-35">{children}</button>;
}
