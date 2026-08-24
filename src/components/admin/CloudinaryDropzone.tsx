"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { cloudinaryUrl } from "@/lib/images";

export type ProductImageValue = { publicId: string; alt: string };

const MAX_IMAGES = 8;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Subida directa del browser a Cloudinary con firma del server.
 * La primera imagen de la lista es la principal; se reordena moviéndola al frente.
 */
export function CloudinaryDropzone({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: ProductImageValue[];
  onChange: (next: ProductImageValue[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      if (!slug) {
        setError("Poné primero el nombre del producto: la carpeta sale del slug.");
        return;
      }

      const room = MAX_IMAGES - value.length;
      if (room <= 0) {
        setError(`Máximo ${MAX_IMAGES} imágenes por producto.`);
        return;
      }

      setError(null);
      setBusy(true);

      try {
        const signRes = await fetch("/api/admin/upload-signature", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const sign = (await signRes.json()) as
          | {
              ok: true;
              cloudName: string;
              apiKey: string;
              timestamp: number;
              folder: string;
              signature: string;
            }
          | { ok: false; error: string };

        if (!signRes.ok || !sign.ok) {
          setError(sign.ok ? "No pudimos firmar la subida." : sign.error);
          return;
        }

        const uploaded: ProductImageValue[] = [];

        for (const file of list.slice(0, room)) {
          if (!ACCEPTED.includes(file.type)) {
            setError(`“${file.name}” no es una imagen admitida (JPG, PNG, WebP o AVIF).`);
            continue;
          }
          if (file.size > MAX_BYTES) {
            setError(`“${file.name}” pesa más de 10 MB.`);
            continue;
          }

          const form = new FormData();
          form.append("file", file);
          form.append("api_key", sign.apiKey);
          form.append("timestamp", String(sign.timestamp));
          form.append("folder", sign.folder);
          form.append("signature", sign.signature);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
            { method: "POST", body: form },
          );

          if (!res.ok) {
            setError(`Cloudinary rechazó “${file.name}”.`);
            continue;
          }

          const data = (await res.json()) as { public_id?: string };
          if (data.public_id) uploaded.push({ publicId: data.public_id, alt: "" });
        }

        if (uploaded.length > 0) onChange([...value, ...uploaded]);
      } catch {
        setError("No pudimos subir las imágenes. Revisá tu conexión.");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [slug, value, onChange],
  );

  return (
    <div>
      <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-content-dim">
        Imágenes · Cloudinary
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn(
          "border border-dashed p-[22px] text-center transition-colors duration-150",
          dragging ? "border-brand bg-brand/[0.06]" : "border-[#3A3A38]",
        )}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-2.5">
            <Spinner size={22} />
            <p className="text-[13px] text-content-muted">Subiendo…</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-content-muted">
              Arrastrá imágenes o{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-brand underline-offset-2 hover:underline"
              >
                buscá en tu equipo
              </button>
            </p>
            <p className="mt-1.5 text-[11px] text-content-faint">
              Se suben a <span className="text-content-muted">guantearqueros/productos/{slug || "…"}</span>
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[11.5px] text-alert-soft">
          {error}
        </p>
      ) : null}

      {value.length > 0 ? (
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {value.map((img, i) => (
            <div key={img.publicId} className={cn("relative aspect-square border", i === 0 ? "border-brand" : "border-line-strong")}>
              <Image
                src={cloudinaryUrl(img.publicId, "thumb")}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />

              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="Quitar imagen"
                className="absolute right-0 top-0 bg-ink-950/80 px-1.5 py-0.5 text-[11px] text-content-muted transition-colors duration-150 hover:text-alert"
              >
                ✕
              </button>

              {i === 0 ? (
                <span className="absolute inset-x-0 bottom-0 bg-brand py-[3px] text-center text-[9px] font-extrabold tracking-[0.1em] text-ink-950">
                  PRINCIPAL
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const next = value.slice();
                    const [moved] = next.splice(i, 1);
                    if (moved) next.unshift(moved);
                    onChange(next);
                  }}
                  className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-[3px] text-center text-[9px] uppercase tracking-[0.1em] text-content-muted transition-colors duration-150 hover:text-brand"
                >
                  Hacer principal
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
