"use client";

import { useCallback, useRef, useState } from "react";
import { CheckIcon, PinIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
import { LOCAL_CENTER } from "@/lib/site";
import { parseMapsUrl } from "@/lib/validators";

/**
 * Selector de ubicación propio. No usa la API de Google ni tiles externos: es la
 * grilla oscura del design system con el pin naranja de marca (nunca el pin rojo
 * de Google). El pin se arrastra o se toca, y la posición se traduce a
 * coordenadas reales con una escala fija alrededor del punto de referencia.
 *
 * Cuatro formas de dar el punto, para que nadie quede trabado:
 *   1. "Usar mi ubicación" (geolocalización del navegador),
 *   2. pegar un link de Google Maps,
 *   3. tocar o arrastrar el pin sobre la grilla,
 *   4. escribir latitud y longitud a mano.
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
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** El permiso quedó bloqueado: hay que decir cómo reactivarlo, no reintentar. */
  const [blocked, setBlocked] = useState(false);
  // Las coordenadas escritas a mano se guardan como texto mientras se tipean:
  // si no, borrar un dígito reformatearía el número debajo del cursor.
  const [manual, setManual] = useState<{ lat: string; lng: string } | null>(null);

  const pin = (() => {
    const w = boxRef.current?.clientWidth ?? 380;
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
      const dx = clientX - rect.left - rect.width / 2;
      const dy = clientY - rect.top - MAP_HEIGHT / 2;
      setManual(null);
      onChange({
        lat: Number((anchor.lat - dy * LAT_PER_PX).toFixed(6)),
        lng: Number((anchor.lng + dx * lngPerPx(anchor.lat)).toFixed(6)),
      });
    },
    [anchor, onChange],
  );

  const useGeolocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite compartir la ubicación.");
      return;
    }
    // El navegador bloquea la geolocalización fuera de HTTPS (localhost sí vale).
    if (!window.isSecureContext) {
      setGeoError("La ubicación solo funciona en sitios seguros (https).");
      return;
    }

    // Si el permiso ya fue bloqueado alguna vez, el navegador NO vuelve a
    // preguntar: getCurrentPosition falla al instante y el botón parece muerto.
    // Se detecta antes para poder explicar cómo desbloquearlo.
    try {
      const permiso = await navigator.permissions.query({ name: "geolocation" });
      if (permiso.state === "denied") {
        setBlocked(true);
        setGeoError("La ubicación está bloqueada para este sitio.");
        return;
      }
    } catch {
      // Permissions API no disponible: se intenta igual y se maneja el error.
    }

    setBusy(true);
    setGeoError(null);
    setBlocked(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setAnchor(next);
        setManual(null);
        onChange(next);
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          setBlocked(true);
          setGeoError("La ubicación está bloqueada para este sitio.");
          return;
        }
        setGeoError(
          err.code === err.TIMEOUT
            ? "La ubicación tardó demasiado. Prueba de nuevo."
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
    setManual(null);
    onChange(coords, pasted.trim());
    setPasted("");
    setPasteError(null);
    setGeoError(null);
  }, [pasted, onChange]);

  /** Coordenada escrita a mano: solo se aplica cuando el número es válido. */
  function setManualCoord(which: "lat" | "lng", raw: string) {
    const base = manual ?? {
      lat: value ? String(value.lat) : "",
      lng: value ? String(value.lng) : "",
    };
    const next = { ...base, [which]: raw };
    setManual(next);

    const lat = Number.parseFloat(next.lat);
    const lng = Number.parseFloat(next.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      setAnchor({ lat, lng });
      onChange({ lat, lng });
    }
  }

  const borderColor = value
    ? "border-[#3F8B55]"
    : geoError || error
      ? "border-alert"
      : "border-line-strong";

  return (
    <div>
      <button
        type="button"
        onClick={useGeolocation}
        disabled={busy}
        className="mb-2 flex w-full items-center justify-center gap-2 border border-brand/60 bg-brand/[0.07] px-4 py-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-brand transition-colors duration-150 hover:bg-brand hover:text-ink-950 disabled:opacity-60"
      >
        <PinIcon size={14} />
        {busy ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
      </button>

      {/* Permiso bloqueado: el navegador ya no vuelve a preguntar, así que
          reintentar no sirve. Se explica cómo reactivarlo y se recuerda que
          igual puede marcar el punto a mano. */}
      {blocked ? (
        <div className="mb-2 border-l-[3px] border-state-warn bg-state-warn/[0.09] px-3.5 py-2.5">
          <p className="text-[12.5px] font-bold text-state-warn">
            Tu navegador tiene bloqueada la ubicación para este sitio.
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-content-muted">
            Toca el candado que está junto a la dirección web, activa “Ubicación” y vuelve a
            intentar. O marca el punto en el mapa de abajo, que funciona igual.
          </p>
        </div>
      ) : null}

      <div
        ref={boxRef}
        onPointerDown={(e) => {
          // Solo el fondo del mapa coloca el pin: si el clic viene de un control
          // encima (por ejemplo el botón del overlay de error), se ignora.
          if (e.target !== e.currentTarget) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setFromPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1 && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            setFromPoint(e.clientX, e.clientY);
          }
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
        <div className="pointer-events-none absolute inset-x-0 top-[58%] h-2.5 bg-[#1E2320]" aria-hidden />
        <div className="pointer-events-none absolute inset-y-0 left-[38%] w-2 bg-[#1E2320]" aria-hidden />

        <div
          className="pointer-events-none absolute flex flex-col items-center"
          style={{ left: pin.x, top: pin.y, transform: "translate(-50%, -100%)" }}
        >
          <div
            className="h-[30px] w-[26px] bg-brand clip-pin"
            style={{ boxShadow: "0 0 26px rgba(250,42,0,0.6)" }}
            aria-hidden
          />
          <div className="-mt-[22px] h-2 w-2 rounded-full border-2 border-brand bg-ink-950" aria-hidden />
        </div>

        <span className="pointer-events-none absolute bottom-2.5 left-2.5 text-[10px] uppercase tracking-[0.12em] text-content-dim">
          {value ? "Arrastra el pin para ajustar" : "Toca el mapa para marcar"}
        </span>

        {geoError && !blocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/85 p-5 text-center">
            <p className="text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-alert-soft">
              {geoError}
            </p>
            <p className="text-xs text-content-muted">
              Marca el punto en el mapa, pega un link de Maps o escribe las coordenadas.
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

      {value ? (
        <div className="mt-[9px] flex flex-wrap items-center gap-2.5 border-l-[3px] border-[#3F8B55] bg-[#3F8B55]/[0.12] px-3 py-2.5">
          <CheckIcon size={14} className="text-[#8FD9A6]" />
          <span className="text-xs text-[#8FD9A6]">Ubicación marcada</span>
          <button
            type="button"
            onClick={() => {
              setManual(null);
              onChange(null);
            }}
            className="ml-auto text-[11px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:text-brand"
          >
            Quitar
          </button>
        </div>
      ) : error ? (
        <p className="mt-1.5 text-xs text-alert-soft" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          <span className="label-xs mb-1.5 text-content-dim">Latitud</span>
          <input
            inputMode="decimal"
            value={manual?.lat ?? (value ? String(value.lat) : "")}
            onChange={(e) => setManualCoord("lat", e.target.value)}
            placeholder="-17.393600"
            className="rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] tabular outline-none focus:border-brand focus:shadow-focus"
          />
        </label>
        <label className="flex flex-col">
          <span className="label-xs mb-1.5 text-content-dim">Longitud</span>
          <input
            inputMode="decimal"
            value={manual?.lng ?? (value ? String(value.lng) : "")}
            onChange={(e) => setManualCoord("lng", e.target.value)}
            placeholder="-66.157000"
            className="rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] tabular outline-none focus:border-brand focus:shadow-focus"
          />
        </label>
      </div>

      <div className="mt-2">
        <span className="label-xs mb-1.5 block text-content-dim">O pega tu link de Google Maps</span>
        <div className="flex gap-2">
          <input
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setPasteError(null);
            }}
            placeholder="https://maps.app.goo.gl/…"
            aria-label="Link de Google Maps"
            className="min-w-0 flex-1 rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:shadow-focus"
          />
          <button
            type="button"
            onClick={applyPasted}
            disabled={!pasted.trim()}
            className="bg-brand px-4 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
          >
            Usar
          </button>
        </div>
        {pasteError ? <p className="mt-1.5 text-xs text-alert-soft">{pasteError}</p> : null}
      </div>
    </div>
  );
}
