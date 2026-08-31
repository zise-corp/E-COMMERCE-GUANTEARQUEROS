"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveHomeSettingsAction } from "@/app/admin/actions";
import { ImageKitDropzone, type ProductImageValue } from "@/components/admin/ImageKitDropzone";
import { Input } from "@/components/ui/Field";
import { SearchIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import type { HomeSettings } from "@/db/queries/settings";
import { imageKitUrl } from "@/lib/images";

type ProductOption = {
  id: number;
  name: string;
  categoryName: string;
  brandName: string | null;
  imagePublicId: string;
};

export function HomeSettingsForm({ initial, products }: { initial: HomeSettings; products: ProductOption[] }) {
  const [form, setForm] = useState(initial);
  const initialProduct = products.find((product) => product.id === initial.heroProductId) ?? null;
  const [productSearch, setProductSearch] = useState(initialProduct?.name ?? "");
  const [productOptionsOpen, setProductOptionsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { show } = useToast();
  const selectedProduct = products.find((product) => product.id === form.heroProductId) ?? null;
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
      <section className="border border-ink-700 bg-ink-850">
        <div className="border-b border-ink-700 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">Hero principal</p>
          <h2 className="mt-1 font-display text-xl uppercase skew-fast-6">Producto destacado</h2>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-content-dim">Elige un producto y usaremos automáticamente su imagen principal en la parte superior del Inicio.</p>
        </div>
        <div className="grid items-start gap-5 p-5 sm:p-6 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Input
              label="Producto que se mostrará"
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
              hint="Haz clic para ver todos los productos con imagen."
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
                    Imagen predeterminada
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
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Producto seleccionado</p>
              {selectedProduct ? (
                <>
                  <p className="mt-1 text-[13px] font-bold text-content">{selectedProduct.name}</p>
                  <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-content-dim">
                    {selectedProduct.brandName ? `${selectedProduct.brandName} · ` : ""}{selectedProduct.categoryName} · GQ-{String(selectedProduct.id).padStart(4, "0")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[12px] text-content-muted">Imagen predeterminada</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-content-dim">Vista previa</p>
            <div className="relative aspect-square overflow-hidden border border-line-strong bg-ink-950">
              {selectedProduct ? <Image src={imageKitUrl(selectedProduct.imagePublicId, "square")} alt={selectedProduct.name} fill sizes="220px" className="object-cover" /> : <div className="flex h-full items-center justify-center px-4 text-center text-[11.5px] text-content-faint">Se usará la imagen predeterminada actual.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="border border-ink-700 bg-ink-850">
        <div className="border-b border-ink-700 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-drei-line">Bloque DREI</p>
          <h2 className="mt-1 font-display text-xl uppercase skew-fast-6">Imagen horizontal</h2>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-content-dim">Sube una imagen, muévela y ajusta el zoom dentro del formato rectangular. El editor la preparará en proporción 16:9 para evitar deformaciones.</p>
        </div>
        <div className="max-w-[620px] p-5 sm:p-6">
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
