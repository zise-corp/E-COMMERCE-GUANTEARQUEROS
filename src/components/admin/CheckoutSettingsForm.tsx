"use client";

import { useState, useTransition } from "react";
import { saveCheckoutSettingsAction } from "@/app/admin/actions";
import type { CheckoutSettings, DiscountCode } from "@/db/queries/settings";
import { useToast } from "@/components/ui/Toast";

// Representación local del descuento mientras se edita. Guardamos `value`
// como texto para que el input pueda quedarse vacío mientras el admin tipea
// (de otra forma `Number("")` devolvía 0 y el campo mostraba un cero fijo
// imposible de borrar). Al guardar lo convertimos a número.
type EditingDiscount = Omit<DiscountCode, "value"> & { value: string };

function toEditing(code: DiscountCode): EditingDiscount {
  return { ...code, value: code.value > 0 ? String(code.value) : "" };
}

export function CheckoutSettingsForm({ initial }: { initial: CheckoutSettings }) {
  const [localDeliveryPrice, setLocalDeliveryPrice] = useState(String(initial.localDeliveryPrice));
  const [transportPrice, setTransportPrice] = useState(String(initial.transportPrice));
  const [discounts, setDiscounts] = useState<EditingDiscount[]>(() => initial.discounts.map(toEditing));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  function update(index: number, patch: Partial<EditingDiscount>) {
    setDiscounts((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  // Solo dígitos, punto o coma. Normalizamos coma → punto. Permitimos cadena
  // vacía (el admin acaba de borrar) y un único punto decimal.
  function sanitizeNumericInput(raw: string): string {
    const cleaned = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length <= 1) return cleaned;
    // Permitir un solo punto decimal
    return `${parts[0]}.${parts.slice(1).join("")}`;
  }

  function save() {
    setMessage(null);

    // Validaciones de descuentos antes de enviar al server: evitar vacíos,
    // valores inválidos y códigos repetidos. El server los valida de nuevo.
    const seen = new Set<string>();
    for (let i = 0; i < discounts.length; i++) {
      const item = discounts[i]!;
      const code = item.code.trim().toUpperCase();
      if (code.length < 2) {
        setMessage({ ok: false, text: `El código #${i + 1} necesita al menos 2 caracteres.` });
        return;
      }
      if (seen.has(code)) {
        setMessage({ ok: false, text: `El código "${code}" está repetido. Cada código debe ser único.` });
        return;
      }
      seen.add(code);
      const parsed = Number.parseFloat(item.value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setMessage({ ok: false, text: `El valor del código "${code}" debe ser un número mayor a 0.` });
        return;
      }
      if (item.type === "percent" && parsed > 100) {
        setMessage({ ok: false, text: `El código "${code}" es un porcentaje; no puede superar 100.` });
        return;
      }
    }

    startTransition(async () => {
      const result = await saveCheckoutSettingsAction({
        localDeliveryPrice: Number(localDeliveryPrice),
        transportPrice: Number(transportPrice),
        discounts: discounts.map((item) => ({
          ...item,
          code: item.code.trim().toUpperCase(),
          value: Number.parseFloat(item.value),
        })),
      });
      if (result.ok) { setMessage(null); show("Configuración guardada."); }
      else setMessage({ ok: false, text: result.error });
    });
  }

  return (
    <div className="space-y-5">
      <section className="admin-panel border border-ink-700 bg-ink-850 p-5">
        <h2 className="text-[14px] font-extrabold uppercase tracking-[0.08em]">Precios de envío</h2>
        <p className="mt-1 text-[12px] text-content-dim">El retiro en las sucursales de La Paz, Santa Cruz y Cochabamba siempre es gratuito.</p>
        <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label-xs mb-1.5 block text-content-dim">Domicilio en ciudades con sucursal · Bs</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={localDeliveryPrice}
            onChange={(event) => setLocalDeliveryPrice(event.target.value)}
            className="w-full border border-line-strong bg-ink-950 px-3 py-3 outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="label-xs mb-1.5 block text-content-dim">Transporte a otros departamentos · Bs</span>
          <input type="number" min="0" step="0.01" value={transportPrice} onChange={(event) => setTransportPrice(event.target.value)} className="w-full border border-line-strong bg-ink-950 px-3 py-3 outline-none focus:border-brand" />
        </label>
        </div>
      </section>

      <section className="admin-panel border border-ink-700 bg-ink-850 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-extrabold uppercase tracking-[0.08em]">Códigos de descuento</h2>
            <p className="mt-1 text-[12px] text-content-dim">Crea descuentos porcentuales o de monto fijo.</p>
          </div>
          <button
            type="button"
            onClick={() => setDiscounts((items) => [...items, { code: "", type: "percent", value: "", active: true }])}
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
                <span className="label-xs mb-1 block text-content-dim">
                  Valor {item.type === "percent" ? "(%)" : "(Bs)"}
                </span>
                {/* type="text" + inputMode="decimal" en lugar de type="number"
                    para no quedar atrapados en el "0" por defecto que el input
                    nativo pone cuando se borra todo el contenido. Sanitizamos
                    cualquier letra o símbolo en onBeforeInput y onChange. */}
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={item.value}
                  placeholder={item.type === "percent" ? "10" : "25"}
                  onChange={(e) => update(index, { value: sanitizeNumericInput(e.target.value) })}
                  onBeforeInput={(event) => {
                    const native = event as unknown as InputEvent;
                    const incoming = native.data ?? "";
                    if (incoming && !/^[0-9.,]+$/.test(incoming)) event.preventDefault();
                  }}
                  className="w-full border border-line-strong bg-ink-950 px-3 py-2.5 outline-none focus:border-brand"
                />
              </label>
              <label className="flex h-[42px] items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={item.active} onChange={(e) => update(index, { active: e.target.checked })} /> Activo
              </label>
              <button type="button" onClick={() => setDiscounts((items) => items.filter((_, i) => i !== index))} className="h-[42px] px-2 text-[11px] uppercase text-alert-soft">Quitar</button>
            </div>
          ))}
        </div>
      </section>

      {message ? <p role="alert" className="text-sm text-alert-soft">{message.text}</p> : null}
      <button type="button" disabled={pending} onClick={save} className="bg-brand px-6 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </div>
  );
}
