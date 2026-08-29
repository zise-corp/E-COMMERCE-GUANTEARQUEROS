"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveHomeSettingsAction } from "@/app/admin/actions";
import { ImageKitDropzone, type ProductImageValue } from "@/components/admin/ImageKitDropzone";
import { Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { HomeSettings } from "@/db/queries/settings";
import { imageKitUrl } from "@/lib/images";

type ProductOption = {
  id: number;
  name: string;
  categoryName: string;
  imagePublicId: string;
};

export function HomeSettingsForm({ initial, products }: { initial: HomeSettings; products: ProductOption[] }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const { show } = useToast();
  const selectedProduct = products.find((product) => product.id === form.heroProductId) ?? null;
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
          <Select
            label="Producto que se mostrará"
            value={form.heroProductId === null ? "" : String(form.heroProductId)}
            hint="Solo aparecen productos que ya tienen al menos una imagen."
            onChange={(event) => setForm({ ...form, heroProductId: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">Imagen predeterminada</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.categoryName}</option>)}
          </Select>

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
