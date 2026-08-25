"use client";

import { useState, useTransition } from "react";
import { saveCheckoutSettingsAction } from "@/app/admin/actions";
import type { CheckoutSettings, DiscountCode } from "@/db/queries/settings";

export function CheckoutSettingsForm({ initial }: { initial: CheckoutSettings }) {
  const [shippingPrice, setShippingPrice] = useState(String(initial.shippingPrice));
  const [discounts, setDiscounts] = useState(initial.discounts);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function update(index: number, patch: Partial<DiscountCode>) {
    setDiscounts((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCheckoutSettingsAction({
        shippingPrice: Number(shippingPrice),
        discounts: discounts.map((item) => ({ ...item, value: Number(item.value) })),
      });
      setMessage({ ok: result.ok, text: result.ok ? "Configuración guardada." : result.error });
    });
  }

  return (
    <div className="space-y-5">
      <section className="border border-ink-700 bg-ink-850 p-5">
        <h2 className="text-[14px] font-extrabold uppercase tracking-[0.08em]">Precio de envío</h2>
        <p className="mt-1 text-[12px] text-content-dim">Se suma al subtotal de cada pedido.</p>
        <label className="mt-4 block max-w-xs">
          <span className="label-xs mb-1.5 block text-content-dim">Costo en Bs</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={shippingPrice}
            onChange={(event) => setShippingPrice(event.target.value)}
            className="w-full border border-line-strong bg-ink-950 px-3 py-3 outline-none focus:border-brand"
          />
        </label>
      </section>

      <section className="border border-ink-700 bg-ink-850 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-extrabold uppercase tracking-[0.08em]">Códigos de descuento</h2>
            <p className="mt-1 text-[12px] text-content-dim">Crea descuentos porcentuales o de monto fijo.</p>
          </div>
          <button
            type="button"
            onClick={() => setDiscounts((items) => [...items, { code: "", type: "percent", value: 10, active: true }])}
            className="border border-brand px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand hover:bg-brand hover:text-ink-950"
          >
            Añadir código
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {discounts.length === 0 ? <p className="py-5 text-center text-sm text-content-dim">No hay códigos creados.</p> : null}
          {discounts.map((item, index) => (
            <div key={index} className="grid gap-2 border border-line-soft p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto_auto] sm:items-end">
              <label>
                <span className="label-xs mb-1 block text-content-dim">Código</span>
                <input value={item.code} onChange={(e) => update(index, { code: e.target.value.toUpperCase() })} className="w-full border border-line-strong bg-ink-950 px-3 py-2.5 uppercase outline-none focus:border-brand" placeholder="ARQUERO10" />
              </label>
              <label>
                <span className="label-xs mb-1 block text-content-dim">Tipo</span>
                <select value={item.type} onChange={(e) => update(index, { type: e.target.value as DiscountCode["type"] })} className="w-full border border-line-strong bg-ink-950 px-3 py-2.5 outline-none focus:border-brand">
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </label>
              <label>
                <span className="label-xs mb-1 block text-content-dim">Valor</span>
                <input type="number" min="0.01" step="0.01" value={item.value} onChange={(e) => update(index, { value: Number(e.target.value) })} className="w-full border border-line-strong bg-ink-950 px-3 py-2.5 outline-none focus:border-brand" />
              </label>
              <label className="flex h-[42px] items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={item.active} onChange={(e) => update(index, { active: e.target.checked })} /> Activo
              </label>
              <button type="button" onClick={() => setDiscounts((items) => items.filter((_, i) => i !== index))} className="h-[42px] px-2 text-[11px] uppercase text-alert-soft">Quitar</button>
            </div>
          ))}
        </div>
      </section>

      {message ? <p className={message.ok ? "text-sm text-state-ok" : "text-sm text-alert-soft"}>{message.text}</p> : null}
      <button type="button" disabled={pending} onClick={save} className="bg-brand px-6 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </div>
  );
}
