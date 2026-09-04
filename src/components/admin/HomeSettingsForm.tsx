"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveHomeSettingsAction } from "@/app/admin/actions";
import { ImageKitDropzone, type ProductImageValue } from "@/components/admin/ImageKitDropzone";
import { Input } from "@/components/ui/Field";
import { SearchIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import type { HomeSettings } from "@/db/queries/settings";
import { cn } from "@/lib/cn";
import { imageKitUrl } from "@/lib/images";

type ProductOption = {
  id: number;
  name: string;
  categoryName: string;
  brandName: string | null;
  imagePublicId: string;
};

export function HomeSettingsForm({ initial, collections }: { initial: HomeSettings; collections: Record<HomeSettings["heroSource"], ProductOption[]> }) {
  const initialProducts = collections[initial.heroSource];
  const initialProduct = initialProducts.find((product) => product.id === initial.heroProductId) ?? null;
  const [form, setForm] = useState({ ...initial, heroProductId: initialProduct?.id ?? null });
  const [productSearch, setProductSearch] = useState(initialProduct?.name ?? "");
  const [productOptionsOpen, setProductOptionsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { show } = useToast();
  const products = collections[form.heroSource];
  const selectedProduct = products.find((product) => product.id === form.heroProductId) ?? null;
  const orderedProducts = selectedProduct
    ? [selectedProduct, ...products.filter((product) => product.id !== selectedProduct.id)]
    : products;
  const productTerm = productSearch.trim().toLowerCase();
  const filteredProducts = productTerm
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(productTerm) ||
          product.categoryName.toLowerCase().includes(productTerm) ||
          (product.brandName ?? "").toLowerCase().includes(productTerm) ||
          `gq-${String(product.id).padStart(4, "0")}`.includes(productTerm),
      )
    : products;
  const dreiImage: ProductImageValue[] = form.dreiImagePath
    ? [{ publicId: form.dreiImagePath, fileId: form.dreiImageFileId, alt: "Imagen DREI de la portada" }]
    : [];

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveHomeSettingsAction(form);
      if (result.ok) {
        setMessage(null);
        show("Portada actualizada.");
      } else setMessage({ ok: false, text: result.error });
    });
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel border border-ink-700 bg-ink-850">
        <div className="border-b border-ink-700 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">Hero principal · Carrusel administrable</p>
          <h2 className="mt-1 font-display text-xl uppercase skew-fast-6">Contenido del carrusel</h2>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-content-dim">Elige qué colección promocionar en el hero y, opcionalmente, qué producto aparecerá primero. La tienda rota las diapositivas cada 5 segundos.</p>
        </div>
        <div className="border-b border-ink-700 px-5 py-4 sm:px-6">
          <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-content-dim">Fuente de productos</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["offers", "new"] as const).map((source) => {
              const active = form.heroSource === source;
              const isOffers = source === "offers";
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, heroSource: source, heroProductId: null });
                    setProductSearch("");
                    setProductOptionsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between border px-4 py-3.5 text-left transition-all",
                    active
                      ? isOffers
                        ? "border-brand bg-brand/[0.1] text-content shadow-[inset_3px_0_#FA2A00]"
                        : "border-[#39BDF8] bg-[#39BDF8]/10 text-content shadow-[inset_3px_0_#39BDF8]"
                      : "border-line-strong bg-ink-950/45 text-content-muted hover:border-content-dim hover:text-content",
                  )}
                >
                  <span>
                    <span className={cn("block text-[12px] font-extrabold uppercase tracking-[0.1em]", active && (isOffers ? "text-brand" : "text-[#7DD3FC]"))}>{isOffers ? "Ofertas" : "Nuevos"}</span>
                    <span className="mt-1 block text-[10.5px] text-content-dim">{isOffers ? "Mayor descuento primero" : "Más recientes primero"}</span>
                  </span>
                  <span className="font-display text-2xl tabular">{collections[source].length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-start gap-5 p-5 sm:p-6 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Input
              label="Producto que aparecerá primero"
              value={productSearch}
              onFocus={(event) => {
                setProductSearch("");
                setProductOptionsOpen(true);
              }}
              onBlur={(event) => {
                const value = event.currentTarget.value;
                window.setTimeout(() => {
                  setProductOptionsOpen(false);
                  if (!value.trim() && selectedProduct) setProductSearch(selectedProduct.name);
                }, 120);
              }}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setProductOptionsOpen(true);
              }}
              placeholder="Busca por nombre, marca, categoría o SKU…"
              autoComplete="off"
              role="combobox"
              aria-expanded={productOptionsOpen}
              aria-controls="featured-product-options"
              endAdornment={<SearchIcon size={16} className="text-content-dim" />}
              hint={`Solo aparecen los productos válidos de “${form.heroSource === "offers" ? "Ofertas" : "Nuevos"}”.`}
            />
            {productOptionsOpen ? (
              <div id="featured-product-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border border-line-strong bg-ink-900 shadow-xl">
                {!productTerm ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={form.heroProductId === null}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setForm({ ...form, heroProductId: null });
                      setProductSearch("");
                      setProductOptionsOpen(false);
                    }}
                    className="block w-full border-b border-ink-700 px-4 py-3 text-left text-[12.5px] text-content-muted hover:bg-ink-800 hover:text-content"
                  >
                    Orden automático
                  </button>
                ) : null}
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={form.heroProductId === product.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setForm({ ...form, heroProductId: product.id });
                      setProductSearch(product.name);
                      setProductOptionsOpen(false);
                    }}
                    className="block w-full border-b border-ink-700 px-4 py-3 text-left last:border-0 hover:bg-ink-800"
                  >
                    <span className="block text-[13px] font-bold text-content">{product.name}</span>
                    <span className="mt-0.5 block text-[10.5px] uppercase tracking-[0.08em] text-content-dim">
                      {product.brandName ? `${product.brandName} · ` : ""}{product.categoryName} · GQ-{String(product.id).padStart(4, "0")}
                    </span>
                  </button>
                ))}
                {filteredProducts.length === 0 ? <p className="px-4 py-5 text-center text-[12px] text-content-dim">No encontramos productos con esa búsqueda.</p> : null}
              </div>
            ) : null}
            <div className="mt-3 border-l-2 border-brand bg-brand/[0.06] px-3.5 py-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Primera diapositiva</p>
              {selectedProduct ? (
                <>
                  <p className="mt-1 text-[13px] font-bold text-content">{selectedProduct.name}</p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-content-dim">
                    {selectedProduct.brandName ? `${selectedProduct.brandName} · ` : ""}{selectedProduct.categoryName} · GQ-{String(selectedProduct.id).padStart(4, "0")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[12px] text-content-muted">Orden automático · {form.heroSource === "offers" ? "mayor descuento primero" : "más recientes primero"}</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-content-dim">Primera imagen</p>
            <div className="relative aspect-square overflow-hidden border border-line-strong bg-ink-950">
              {orderedProducts[0] ? <Image src={imageKitUrl(orderedProducts[0].imagePublicId, "square")} alt={orderedProducts[0].name} fill sizes="240px" className="object-cover" /> : <div className="flex h-full items-center justify-center px-4 text-center text-[11.5px] leading-relaxed text-content-faint">No hay productos disponibles en esta colección.</div>}
            </div>
          </div>
        </div>

        <div className="border-t border-ink-700 px-5 py-5 sm:px-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">Vista previa del carrusel</p>
              <p className="mt-1 text-[11.5px] text-content-dim">Orden exacto de las diapositivas en la tienda.</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.12em] text-content-faint">{orderedProducts.length} de 6 posiciones</span>
          </div>
          {orderedProducts.length > 0 ? (
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {orderedProducts.map((product, index) => (
                <li key={product.id} className={cn("group relative overflow-hidden border bg-ink-950", index === 0 ? "border-brand" : "border-line-strong")}>
                  <div className="relative aspect-square">
                    <Image src={imageKitUrl(product.imagePublicId, "square")} alt={product.name} fill sizes="160px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    <span className={cn("absolute left-0 top-0 px-2 py-1 font-display text-sm tabular", index === 0 ? "bg-brand text-ink-950" : "bg-ink-950/85 text-content")}>{String(index + 1).padStart(2, "0")}</span>
                    {index === 0 ? <span className="absolute right-0 top-0 bg-ink-950/85 px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-brand">Primero</span> : null}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-2.5 pb-2.5 pt-8">
                      <p className="truncate text-[10.5px] font-bold text-content">{product.name}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="border border-dashed border-line-strong bg-ink-950/35 px-4 py-8 text-center text-[12px] text-content-dim">No hay productos publicados con stock e imagen dentro de “{form.heroSource === "offers" ? "Ofertas" : "Nuevos"}”.</div>
          )}
        </div>
      </section>

      <section className="admin-panel border border-ink-700 bg-ink-850">
        <div className="border-b border-ink-700 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-drei-line">Bloque DREI</p>
          <h2 className="mt-1 font-display text-xl uppercase skew-fast-6">Imagen horizontal</h2>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-content-dim">Sube una imagen, muévela y ajusta el zoom dentro del formato rectangular. El editor la preparará en proporción 16:9 para evitar deformaciones.</p>
        </div>
        <div className="mx-auto w-full max-w-[620px] p-5 sm:p-6">
          <ImageKitDropzone
            slug="portada-drei"
            value={dreiImage}
            onChange={(next) => {
              const image = next[0];
              setForm({ ...form, dreiImagePath: image?.publicId ?? null, dreiImageFileId: image?.fileId ?? null });
            }}
            folder="/guantearqueros/inicio"
            maxImages={1}
            label="Imagen horizontal DREI · ImageKit"
            assetTag="inicio-drei"
            wideCrop
          />
        </div>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border border-ink-700 bg-[#0F0F0E]/95 p-4 backdrop-blur">
        {message ? <p role="alert" className="mr-auto text-[12px] text-alert-soft">{message.text}</p> : null}
        <button type="button" onClick={save} disabled={pending} className="bg-brand px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
