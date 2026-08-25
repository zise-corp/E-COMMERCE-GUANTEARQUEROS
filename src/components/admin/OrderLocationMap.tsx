"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import { PinIcon } from "@/components/ui/Icons";

export function OrderLocationMap({
  lat,
  lng,
  mapsUrl,
}: {
  lat: number;
  lng: number;
  mapsUrl: string | null;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const href = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || mapRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    let disposed = false;

    void import("leaflet").then((leaflet) => {
      if (disposed || !nodeRef.current) return;
      const map = leaflet.map(nodeRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([lat, lng], 17);

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = leaflet.divIcon({
        className: "gq-map-marker",
        html: '<b aria-hidden="true">Entrega aquí</b><span aria-hidden="true"></span>',
        iconSize: [44, 52],
        iconAnchor: [22, 48],
      });
      leaflet.marker([lat, lng], { icon }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="mt-3 overflow-hidden border border-line-strong">
      <div ref={nodeRef} className="h-[210px] w-full bg-[#d7d2c8]" aria-label="Mapa de la ubicación de entrega" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-ink-900 px-3 py-2.5">
        <span className="text-[10.5px] text-content-dim tabular">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-brand hover:text-brand-hot">
          <PinIcon size={12} />
          Abrir en Google Maps ↗
        </a>
      </div>
    </div>
  );
}
