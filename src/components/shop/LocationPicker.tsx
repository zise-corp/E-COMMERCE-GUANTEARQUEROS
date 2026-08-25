"use client";

import "leaflet/dist/leaflet.css";

import type { LeafletMouseEvent, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, PinIcon } from "@/components/ui/Icons";
import { LOCAL_CENTER } from "@/lib/site";
import { parseMapsUrl } from "@/lib/validators";

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
  const [geoError, setGeoError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [manual, setManual] = useState<{ lat: string; lng: string } | null>(null);

  const updateLocation = useCallback(
    (next: LatLng | null, mapsUrl?: string) => {
      setManual(null);
      onChange(next, mapsUrl);
    },
    [onChange],
  );

  const useGeolocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite compartir la ubicación.");
      return;
    }
    if (!window.isSecureContext) {
      setGeoError("La ubicación solo funciona en sitios seguros (https).");
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") {
        setBlocked(true);
        setGeoError("La ubicación está bloqueada para este sitio.");
        return;
      }
    } catch {
      // Algunos navegadores no exponen Permissions API; se intenta igualmente.
    }

    setBusy(true);
    setGeoError(null);
    setBlocked(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        updateLocation(next);
        setBusy(false);
      },
      (geolocationError) => {
        setBusy(false);
        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          setBlocked(true);
          setGeoError("La ubicación está bloqueada para este sitio.");
          return;
        }
        setGeoError(
          geolocationError.code === geolocationError.TIMEOUT
            ? "La ubicación tardó demasiado. Prueba de nuevo."
            : "No pudimos obtener tu ubicación.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [updateLocation]);

  const applyPasted = useCallback(() => {
    const coordinates = parseMapsUrl(pasted);
    if (!coordinates) {
      setPasteError("No encontramos coordenadas en ese enlace.");
      return;
    }
    updateLocation(coordinates, pasted.trim());
    setPasted("");
    setPasteError(null);
    setGeoError(null);
  }, [pasted, updateLocation]);

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
      onChange({ lat, lng });
    }
  }

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

      {blocked ? (
        <div className="mb-2 border-l-[3px] border-state-warn bg-state-warn/[0.09] px-3.5 py-2.5">
          <p className="text-[12.5px] font-bold text-state-warn">
            Tu navegador tiene bloqueada la ubicación para este sitio.
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-content-muted">
            Activa “Ubicación” desde el candado junto a la dirección web, o marca el punto en el
            mapa.
          </p>
        </div>
      ) : null}

      <RealMap value={value} onChange={updateLocation} hasError={Boolean(error || geoError)} />

      {geoError && !blocked ? (
        <p className="mt-1.5 text-xs text-alert-soft">{geoError} Puedes marcar el punto en el mapa.</p>
      ) : null}

      {value ? (
        <div className="mt-[9px] flex flex-wrap items-center gap-2.5 border-l-[3px] border-[#3F8B55] bg-[#3F8B55]/[0.12] px-3 py-2.5">
          <CheckIcon size={14} className="text-[#8FD9A6]" />
          <span className="text-xs text-[#8FD9A6]">Ubicación marcada</span>
          <span className="text-[11px] text-content-dim tabular">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </span>
          <button
            type="button"
            onClick={() => updateLocation(null)}
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
            onChange={(event) => setManualCoord("lat", event.target.value)}
            placeholder="-16.523626"
            className="rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] tabular outline-none focus:border-brand focus:shadow-focus"
          />
        </label>
        <label className="flex flex-col">
          <span className="label-xs mb-1.5 text-content-dim">Longitud</span>
          <input
            inputMode="decimal"
            value={manual?.lng ?? (value ? String(value.lng) : "")}
            onChange={(event) => setManualCoord("lng", event.target.value)}
            placeholder="-68.112377"
            className="rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] tabular outline-none focus:border-brand focus:shadow-focus"
          />
        </label>
      </div>

      <div className="mt-2">
        <span className="label-xs mb-1.5 block text-content-dim">O pega tu enlace de Google Maps</span>
        <div className="flex gap-2">
          <input
            value={pasted}
            onChange={(event) => {
              setPasted(event.target.value);
              setPasteError(null);
            }}
            placeholder="https://maps.app.goo.gl/…"
            aria-label="Enlace de Google Maps"
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

function RealMap({
  value,
  onChange,
  hasError,
}: {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  hasError: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const callbackRef = useRef(onChange);

  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || mapRef.current) return;
    let disposed = false;

    void import("leaflet").then((leaflet) => {
      if (disposed || !nodeRef.current) return;
      const initial = value ?? LOCAL_CENTER;
      const map = leaflet.map(nodeRef.current, { zoomControl: true }).setView(
        [initial.lat, initial.lng],
        value ? 17 : 15,
      );
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);

      const icon = leaflet.divIcon({
        className: "gq-map-marker",
        html: '<b aria-hidden="true">Entrega aquí</b><span aria-hidden="true"></span>',
        iconSize: [44, 52],
        iconAnchor: [22, 48],
      });

      function placeMarker(next: LatLng, emit: boolean) {
        if (!markerRef.current) {
          const marker = leaflet.marker([next.lat, next.lng], { draggable: true, icon }).addTo(map);
          marker.on("dragend", () => {
            const point = marker.getLatLng();
            callbackRef.current({
              lat: Number(point.lat.toFixed(6)),
              lng: Number(point.lng.toFixed(6)),
            });
          });
          markerRef.current = marker;
        } else {
          markerRef.current.setLatLng([next.lat, next.lng]);
        }
        if (emit) callbackRef.current(next);
      }

      map.on("click", (event: LeafletMouseEvent) => {
        const next = {
          lat: Number(event.latlng.lat.toFixed(6)),
          lng: Number(event.latlng.lng.toFixed(6)),
        };
        placeMarker(next, true);
      });

      if (value) placeMarker(value, false);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      disposed = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // El mapa se crea una sola vez; los cambios de valor se sincronizan abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      map.setView([LOCAL_CENTER.lat, LOCAL_CENTER.lng], 15);
      return;
    }
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      return;
    }
    void import("leaflet").then((leaflet) => {
      if (!mapRef.current || markerRef.current) return;
      const icon = leaflet.divIcon({
        className: "gq-map-marker",
        html: '<b aria-hidden="true">Entrega aquí</b><span aria-hidden="true"></span>',
        iconSize: [44, 52],
        iconAnchor: [22, 48],
      });
      const marker = leaflet.marker([value.lat, value.lng], { draggable: true, icon }).addTo(mapRef.current);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        callbackRef.current({ lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) });
      });
      markerRef.current = marker;
    });
  }, [value]);

  return (
    <div
      className={hasError ? "overflow-hidden border border-alert" : "overflow-hidden border border-line-strong"}
    >
      <div
        ref={nodeRef}
        className="gq-delivery-map h-[210px] w-full bg-[#d7d2c8] sm:h-[230px]"
        aria-label="Mapa real para marcar la ubicación de entrega"
      />
      <p className="flex items-center gap-2 border-t border-line bg-ink-900 px-3 py-2.5 text-[11px] leading-snug text-content-muted">
        <PinIcon size={14} className="shrink-0 text-brand" />
        Toca el lugar exacto de entrega o arrastra el pin naranja para corregirlo.
      </p>
    </div>
  );
}
