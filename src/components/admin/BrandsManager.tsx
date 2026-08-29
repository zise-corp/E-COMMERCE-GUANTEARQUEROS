"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteBrandAction, saveBrandAction } from "@/app/admin/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Field";
import { CloseIcon, EditIcon, TrashIcon } from "@/components/ui/Icons";
import { Portal } from "@/components/ui/Portal";
import { Toggle } from "@/components/ui/Toggle";
import { useDialog } from "@/components/ui/useDialog";
import type { AdminBrandRow } from "@/db/queries/admin";

type Editing = Omit<AdminBrandRow, "productCount">;

export function BrandsManager({ rows, openNew = false }: { rows: AdminBrandRow[]; openNew?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<Editing | null>(() => openNew ? { id: 0, name: "", slug: "", accentHex: null, active: true, isOwnBrand: false } : null);
  const [target, setTarget] = useState<AdminBrandRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (openNew) {
      setError(null);
      setForm({ id: 0, name: "", slug: "", accentHex: null, active: true, isOwnBrand: false });
    }
  }, [openNew]);

  function close() { setForm(null); setError(null); router.replace("/admin/marcas"); }
  function save() {
    if (!form) return;
    startTransition(async () => {
      const result = await saveBrandAction({ name: form.name, accentHex: form.accentHex, active: form.active, isOwnBrand: form.isOwnBrand }, form.id || undefined);
      if (!result.ok) { setError(result.error); return; }
      close(); router.refresh();
    });
  }
  function remove() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteBrandAction(target.id);
      if (!result.ok) { setError(result.error); setTarget(null); return; }
      setTarget(null); router.refresh();
    });
  }

  return <>
    <div className="border border-ink-700 bg-ink-850">
      <div className="hidden border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[1.6fr_1fr_100px_90px_80px] lg:gap-3.5"><span>Marca</span><span>Tipo</span><span>Productos</span><span>Estado</span><span /></div>
      {error && !form ? <p className="border-b border-ink-700 px-5 py-3 text-[12px] text-alert-soft">{error}</p> : null}
      {rows.length === 0 ? <p className="px-5 py-12 text-center text-[13px] text-content-dim">Todavía no hay marcas.</p> : null}
      {rows.map((row) => <div key={row.id} className="grid items-center gap-3.5 border-b border-line-soft px-5 py-3 lg:grid-cols-[1.6fr_1fr_100px_90px_80px]">
        <div><p className="text-[13.5px] font-bold">{row.name}</p><p className="mt-0.5 text-[11px] text-content-faint">/{row.slug}</p></div>
        <span className={row.isOwnBrand ? "text-[11px] font-extrabold uppercase tracking-[0.1em] text-drei-ink" : "text-[13px] text-content-muted"}>{row.isOwnBrand ? "Marca propia" : "Marca externa"}</span>
        <span className="text-[13.5px] font-extrabold tabular">{row.productCount}</span><span className={row.active ? "text-[11px] uppercase text-state-ok" : "text-[11px] uppercase text-content-faint"}>{row.active ? "Visible" : "Oculta"}</span>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setForm({ ...row })} aria-label={`Editar ${row.name}`} className="flex h-7 w-7 items-center justify-center text-content-muted hover:text-brand"><EditIcon size={16} /></button><button type="button" onClick={() => setTarget(row)} aria-label={`Borrar ${row.name}`} className="flex h-7 w-7 items-center justify-center text-content-faint hover:text-alert"><TrashIcon size={16} /></button></div>
      </div>)}
    </div>
    <BrandModal form={form} pending={pending} error={error} onChange={setForm} onClose={close} onSave={save} />
    <ConfirmModal open={Boolean(target)} title="Eliminar marca" description={target ? `¿Quieres eliminar “${target.name}”? Solo es posible si no tiene productos.` : ""} busy={pending} onClose={() => setTarget(null)} onConfirm={remove} />
  </>;
}

function BrandModal({ form, pending, error, onChange, onClose, onSave }: { form: Editing | null; pending: boolean; error: string | null; onChange: (next: Editing) => void; onClose: () => void; onSave: () => void }) {
  const ref = useDialog(Boolean(form), onClose);
  if (!form) return null;
  return <Portal><div className="fixed inset-0 z-[70] overflow-y-auto bg-[#040404]/[0.78] p-5 sm:p-10"><div ref={ref} role="dialog" aria-modal="true" aria-label="Marca" tabIndex={-1} className="mx-auto w-full max-w-[600px] border border-line-strong bg-ink-850 animate-rise outline-none">
    <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5"><h2 className="font-display text-2xl uppercase skew-fast-6">{form.id ? "Editar marca" : "Nueva marca"}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="text-content-dim hover:text-brand"><CloseIcon size={19} /></button></div>
    <div className="flex flex-col gap-5 p-6">
      <div className="grid gap-3.5 md:grid-cols-2">
        <Input label="Nombre de la marca" value={form.name} className="bg-[#0E0E0D]" onChange={(event) => onChange({ ...form, name: event.target.value })} />
        <Input label="Color de acento" value={form.accentHex ?? ""} placeholder="#FA2A00" hint="Opcional, en formato hexadecimal." className="bg-[#0E0E0D]" onChange={(event) => onChange({ ...form, accentHex: event.target.value || null })} />
        <div className="border border-ink-700 bg-[#0E0E0D] p-3.5"><Toggle checked={form.active} label="Visible en la tienda" onChange={(active) => onChange({ ...form, active })} /></div>
        <div className="border border-drei-line/40 bg-drei/[0.08] p-3.5"><Toggle checked={form.isOwnBrand} label="Es la marca propia" onChange={(isOwnBrand) => onChange({ ...form, isOwnBrand })} /><p className="mt-2 text-[11px] text-content-dim">Solo una marca puede estar marcada como propia.</p></div>
      </div>
    </div>
    <div className="border-t border-ink-700 px-6 py-5">{error ? <p className="mb-3 text-[12px] text-alert-soft">{error}</p> : null}<div className="flex justify-end gap-2.5"><button type="button" onClick={onClose} className="border border-line-strong px-4 py-2.5 text-[11px] uppercase text-content-muted">Cancelar</button><button type="button" onClick={onSave} disabled={pending || form.name.trim().length < 2} className="bg-brand px-5 py-2.5 text-[11px] font-extrabold uppercase text-ink-950 disabled:bg-ink-700">{pending ? "Guardando…" : "Guardar"}</button></div></div>
  </div></div></Portal>;
}
