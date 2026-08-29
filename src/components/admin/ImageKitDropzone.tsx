"use client";

import { upload as uploadToImageKit } from "@imagekit/next";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { TrashIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { imageKitUrl, IMAGEKIT_FOLDER } from "@/lib/images";

export type ProductImageValue = { publicId: string; fileId: string | null; alt: string };

const MAX_IMAGES = 8;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type UploadAuth =
  | { ok: true; publicKey: string; token: string; expire: number; signature: string }
  | { ok: false; error: string };

/** Subida directa y autenticada a ImageKit. La primera imagen es la principal. */
export function ImageKitDropzone({
  slug,
  value,
  onChange,
  folder = IMAGEKIT_FOLDER,
  maxImages = MAX_IMAGES,
  label = "Imágenes · ImageKit",
  assetTag = "producto",
}: {
  slug: string;
  value: ProductImageValue[];
  onChange: (next: ProductImageValue[]) => void;
  folder?: string;
  maxImages?: number;
  label?: string;
  assetTag?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (!slug) {
      setError("Pon primero el nombre del producto: la carpeta sale del slug.");
      return;
    }

    const room = maxImages - value.length;
    if (room <= 0) {
      setError(`Máximo ${maxImages} ${maxImages === 1 ? "imagen" : "imágenes"}.`);
      return;
    }

    setError(null);
    setBusy(true);
    try {
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

        const authRes = await fetch("/api/admin/imagekit-auth", { cache: "no-store" });
        const auth = (await authRes.json()) as UploadAuth;
        if (!authRes.ok || !auth.ok) {
          setError(auth.ok ? "No pudimos autorizar la subida." : auth.error);
          break;
        }

        const result = await uploadToImageKit({
          file,
          fileName: file.name,
          folder: `${folder}/${slug}`,
          useUniqueFileName: true,
          publicKey: auth.publicKey,
          token: auth.token,
          expire: auth.expire,
          signature: auth.signature,
          tags: ["guantearqueros", assetTag],
        });

        if (!result.filePath || !result.fileId) {
          setError(`ImageKit no devolvió los datos de “${file.name}”.`);
          continue;
        }
        uploaded.push({ publicId: result.filePath, fileId: result.fileId, alt: "" });
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } catch {
      setError("No pudimos subir las imágenes. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [slug, value, onChange, folder, maxImages, assetTag]);

  return (
    <div>
      <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-content-dim">
        {label}
      </p>
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
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
              Arrastra imágenes o{" "}
              <button type="button" onClick={() => inputRef.current?.click()} className="text-brand underline-offset-2 hover:underline">
                busca en tu equipo
              </button>
            </p>
            <p className="mt-1.5 text-[11px] text-content-faint">
              Se sube a <span className="text-content-muted">{folder}/{slug || "…"}</span>
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => event.target.files && void upload(event.target.files)}
        />
      </div>

      {error ? <p role="alert" className="mt-2 text-[11.5px] text-alert-soft">{error}</p> : null}

      {value.length > 0 ? (
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {value.map((img, index) => (
            <div key={`${img.fileId ?? img.publicId}-${index}`} className={cn("relative aspect-square border", index === 0 ? "border-brand" : "border-line-strong")}>
              <Image src={imageKitUrl(img.publicId, "thumb")} alt="" fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                aria-label="Quitar imagen"
                className="absolute right-0 top-0 bg-ink-950/80 px-1.5 py-0.5 text-[11px] text-content-muted transition-colors duration-150 hover:text-alert"
              >
                <TrashIcon size={14} />
              </button>
              {index === 0 ? (
                <span className="absolute inset-x-0 bottom-0 bg-brand py-[3px] text-center text-[9px] font-extrabold tracking-[0.1em] text-ink-950">PRINCIPAL</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const next = value.slice();
                    const [moved] = next.splice(index, 1);
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
