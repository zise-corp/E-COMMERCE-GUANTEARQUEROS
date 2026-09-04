"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useState } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";

async function loadImage(source: string): Promise<HTMLImageElement> {
  const image = new window.Image();
  image.src = source;
  await image.decode();
  return image;
}

async function createCroppedFile(source: string, area: Area, originalName: string, outputWidth: number, outputHeight: number): Promise<File> {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen.");

  context.fillStyle = "#0A0A09";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo recortar la imagen.")), "image/jpeg", 0.92);
  });
  const baseName = originalName.replace(/\.[^.]+$/, "") || "categoria";
  return new File([blob], `${baseName}-recortada.jpg`, { type: "image/jpeg" });
}

export function SquareImageCropper({
  source,
  fileName,
  aspect = 1,
  outputWidth = 1200,
  outputHeight = 1200,
  eyebrow = "Imagen de categoría",
  title = "Ajustar encuadre",
  onCancel,
  onConfirm,
}: {
  source: string;
  fileName: string;
  aspect?: number;
  outputWidth?: number;
  outputHeight?: number;
  eyebrow?: string;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
}) {
  const dialogRef = useDialog(true, onCancel);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rememberCrop = useCallback((_area: Area, croppedAreaPixels: Area) => setPixels(croppedAreaPixels), []);

  async function confirm() {
    if (!pixels || processing) return;
    setProcessing(true);
    setError(null);
    try {
      await onConfirm(await createCroppedFile(source, pixels, fileName, outputWidth, outputHeight));
    } catch {
      setError("No pudimos preparar el recorte. Prueba con otra imagen.");
      setProcessing(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#040404]/90 p-4 sm:p-8">
        <button type="button" aria-label="Cerrar editor" tabIndex={-1} onClick={onCancel} className="absolute inset-0 cursor-default" />
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Ajustar imagen cuadrada" tabIndex={-1} className="admin-modal relative w-full max-w-[720px] border border-line-strong bg-ink-850 outline-none">
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
              <h2 className="mt-1 font-display text-2xl uppercase skew-fast-6">{title}</h2>
            </div>
            <button type="button" onClick={onCancel} aria-label="Cerrar" className="p-1 text-content-dim transition-colors hover:text-brand"><CloseIcon size={19} /></button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="mb-3 text-[12px] leading-relaxed text-content-muted">Arrastra la imagen dentro del cuadro y usa el zoom hasta obtener el encuadre deseado.</p>
            <div className="relative h-[min(58vh,520px)] min-h-[300px] overflow-hidden bg-ink-950">
              <Cropper image={source} crop={crop} zoom={zoom} aspect={aspect} cropShape="rect" showGrid objectFit="cover" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={rememberCrop} />
            </div>
            <label className="mt-4 flex items-center gap-3 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-content-dim">
              Zoom
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-1 flex-1 accent-brand" />
            </label>
            {error ? <p role="alert" className="mt-3 text-[12px] text-alert-soft">{error}</p> : null}
          </div>

          <div className="flex justify-end gap-2.5 border-t border-ink-700 px-5 py-4 sm:px-6">
            <button type="button" onClick={onCancel} disabled={processing} className="border border-line-strong px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-muted hover:border-content-dim disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void confirm()} disabled={!pixels || processing} className="bg-brand px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint">{processing ? "Preparando…" : "Usar encuadre"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
