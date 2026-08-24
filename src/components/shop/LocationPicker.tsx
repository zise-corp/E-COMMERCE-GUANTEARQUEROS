"use client";

import { useCallback, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { LOCAL_CENTER } from "@/lib/site";
import { parseMapsUrl } from "@/lib/validators";

/**
 * Selector de ubicación propio. No usa la API de Google ni tiles externos: es la
 * grilla oscura del design system con el pin naranja de marca (nunca el pin rojo
 * de Google). El pin se arrastra o se clickea, y la posición se traduce a
 * coordenadas reales con una escala fija alrededor del punto de referencia.
 *
 * Tres entradas, para que el cliente nunca quede sin salida:
 *   1. "Usar mi ubicación" (geolocalización del navegador),
 *   2. pegar un link de Google Maps,
 *   3. marcar el punto a mano sobre la grilla.
 */

const MAP_HEIGHT = 190;
/** Metros por píxel: el recuadro cubre unos 400 m de alto. */
const M_PER_PX = 2.1;
const LAT_PER_PX = M_PER_PX / 111_320;

function lngPerPx(lat: number) {
  const denom = 111_320 * Math.cos((lat * Math.PI) / 180);
  return M_PER_PX / (Math.abs(denom) < 1 ? 1 : denom);
}

export type LatLng = { lat: number; lng: number };

export function LocationPicker({
  value,
  onChange,
  error,
}: {
  value: LatLng | null;
  onChange: (next: LatLng | null, mapsUrl?: string) => void;
  error?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<LatLng>(value ?? LOCAL_CENTER);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Posición del pin dentro del recuadro, derivada de las coordenadas.
  const pin = (() => {
    const box = boxRef.current;
    const w = box?.clientWidth ?? 380;
    if (!value) return { x: w / 2, y: MAP_HEIGHT / 2 };
    const dx = (value.lng - anchor.lng) / lngPerPx(anchor.lat);
    const dy = -(value.lat - anchor.lat) / LAT_PER_PX;
    return {
      x: Math.min(w - 6, Math.max(6, w / 2 + dx)),
      y: Math.min(MAP_HEIGHT - 6, Math.max(6, MAP_HEIGHT / 2 + dy)),
    };
  })();

  const setFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const box = boxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const dx = x - rect.width / 2;
      const dy = y - MAP_HEIGHT / 2;
      onChange({
        lat: Number((anchor.lat - dy * LAT_PER_PX).toFixed(6)),
        lng: Number((anchor.lng + dx * lngPerPx(anchor.lat)).toFixed(6)),
      });
    },
    [anchor, onChange],
  );

  const useGeolocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite compartir la ubicación.");
      return;
    }
    setBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setAnchor(next);
        onChange(next);
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "No nos diste permiso para ver tu ubicación."
            : "No pudimos obtener tu ubicación.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onChange]);

  const applyPasted = useCallback(() => {
    const coords = parseMapsUrl(pasted);
    if (!coords) {
      setPasteError("No encontramos coordenadas en ese link.");
      return;
    }
    setAnchor(coords);
    onChange(coords, pasted.trim());
    setPasting(false);
    setPasted("");
    setPasteError(null);
    setGeoError(null);
  }, [pasted, onChange]);

  const borderColor = value ? "border-[#3F8B55]" : geoError || error ? "border-alert" : "border-line-strong";

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) setFromPoint(e.clientX, e.clientY);
        }}
        role="application"
        aria-label="Mapa para marcar la ubicación de entrega"
        className={cn(
          "relative cursor-crosshair touch-none overflow-hidden border bg-map",
          borderColor,
        )}
        style={{ height: MAP_HEIGHT }}
      >
        {/* Dos avenidas insinuadas: dan referencia sin fingir un mapa real. */}
        <div className="absolute inset-x-0 top-[58%] h-2.5 bg-[#1E2320]" aria-hidden />
        <div className="absolute inset-y-0 left-[38%] w-2 bg-[#1E2320]" aria-hidden />

        <div
          className="pointer-events-none absolute flex flex-col items-center"
          style={{ left: pin.x, top: pin.y, transform: "translate(-50%, -100%)" }}
        >
          <div
            className="h-[30px] w-[26px] bg-brand clip-pin"
            style={{ boxShadow: "0 0 26px rgba(250,42,0,0.6)" }}
            aria-hidden
          />
          <div
            className="-mt-[22px] h-2 w-2 rounded-full border-2 border-brand bg-ink-950"
            aria-hidden
          />
        </div>

        <span className="pointer-events-none absolute bottom-2.5 left-2.5 text-[10px] uppercase tracking-[0.12em] text-content-dim">
          {value ? "Arrastrá el pin para ajustar" : "Tocá el mapa para marcar"}
        </span>

        {geoError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/85 p-5 text-center">
            <p className="text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-alert-soft">
              {geoError}
            </p>
            <p className="text-xs text-content-muted">
              Marcá el punto en el mapa o pegá un link de Google Maps.
            </p>
            <button
              type="button"
              onClick={() => setGeoError(null)}
              className="border border-brand px-3.5 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-brand transition-colors duration-150 hover:bg-brand hover:text-ink-950"
            >
              Marcar manualmente
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={useGeolocation}
          disabled={busy}
          className="border border-line-strong p-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {busy ? "Buscando…" : "Usar mi ubicación"}
        </button>
        <button
          type="button"
          onClick={() => setPasting((p) => !p)}
          className="border border-line-strong p-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
        >
          Pegar link Maps
        </button>
      </div>

      {pasting ? (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setPasteError(null);
              }}
              placeholder="https://maps.app.goo.gl/… o -17.3936, -66.1570"
              aria-label="Link de Google Maps"
              className="min-w-0 flex-1 rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:shadow-focus"
            />
            <button
              type="button"
              onClick={applyPasted}
              className="bg-brand px-4 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot"
            >
              Usar
            </button>
          </div>
          {pasteError ? <p className="mt-1.5 text-xs text-alert-soft">{pasteError}</p> : null}
          <p className="mt-1.5 text-[11px] leading-relaxed text-content-faint">
            En Google Maps: mantené apretado el punto, tocá “Compartir” y pegá el link acá.
          </p>
        </div>
      ) : null}

      {value ? (
        <div className="mt-[9px] flex items-center gap-2.5 border-l-[3px] border-[#3F8B55] bg-[#3F8B55]/[0.12] px-3 py-2.5">
          <CheckIcon size={14} className="text-[#8FD9A6]" />
          <span className="text-xs text-[#8FD9A6] tabular">
            Ubicación confirmada · {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto text-[11px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:text-brand"
          >
            Cambiar
          </button>
        </div>
      ) : error ? (
        <p className="mt-1.5 text-xs text-alert-soft" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
