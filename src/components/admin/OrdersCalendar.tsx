"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

function todayInBolivia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value["year"]}-${value["month"]}-${value["day"]}`;
}

export function OrdersCalendar({ selectedDate }: { selectedDate?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (date) params.set("date", date);
    else params.delete("date");
    startTransition(() => router.replace(`/admin/pedidos${params.size ? `?${params}` : ""}`));
  }

  return (
    <section className="admin-panel mb-5 flex flex-wrap items-end gap-3 border border-ink-700 bg-ink-850 p-4">
      <label className="min-w-[210px] flex-1 sm:max-w-[280px]">
        <span className="label-xs mb-1.5 block text-content-dim">Calendario de ventas</span>
        <input
          type="date"
          value={selectedDate ?? ""}
          onChange={(event) => select(event.target.value)}
          className="h-[43px] w-full border border-line-strong bg-ink-950 px-3 text-[13px] text-content outline-none [color-scheme:dark] focus:border-brand"
        />
      </label>
      <button type="button" onClick={() => select(todayInBolivia())} disabled={pending} className="h-[43px] border border-brand px-4 text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand hover:bg-brand hover:text-ink-950 disabled:opacity-50">
        Hoy
      </button>
      {selectedDate ? (
        <button type="button" onClick={() => select("")} disabled={pending} className="h-[43px] border border-line-strong px-4 text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-dim hover:border-content hover:text-content disabled:opacity-50">
          Ver todas las fechas
        </button>
      ) : null}
      <p className="w-full text-[11.5px] text-content-dim sm:ml-auto sm:w-auto">
        {pending ? "Cargando fecha…" : selectedDate ? "Mostrando pedidos del día seleccionado" : "Selecciona un día para ver el detalle"}
      </p>
    </section>
  );
}
