"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveHomeSettingsAction } from "@/app/admin/actions";
import { ImageKitDropzone, type ProductImageValue } from "@/components/admin/ImageKitDropzone";
import { useToast } from "@/components/ui/Toast";
import type { HomeSettings } from "@/db/queries/settings";
import { cn } from "@/lib/cn";
import { imageKitUrl } from "@/lib/images";

type ProductOption = {
  id: number;
  name: string;
  imagePublicId: string;
};

export function HomeSettingsForm({ initial, collections }: { initial: HomeSettings; collections: Record<HomeSettings["heroSource"], ProductOption[]> }) {
  const [form, setForm] = useState({ ...initial, heroProductId: null });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { show } = useToast();
  const products = collections[form.heroSource];
  const orderedProducts = products;
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
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-content-dim">Elige qué colección promocionar en el hero. La tienda ordena los productos automáticamente y rota las diapositivas cada 5 segundos.</p>
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
