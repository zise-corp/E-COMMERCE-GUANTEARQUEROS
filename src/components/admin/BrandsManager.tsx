"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteBrandAction, reorderBrandsAction, saveBrandAction } from "@/app/admin/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Field";
import { CloseIcon, EditIcon, EyeIcon, GripIcon, TrashIcon } from "@/components/ui/Icons";
import { Portal } from "@/components/ui/Portal";
import { Toggle } from "@/components/ui/Toggle";
import { useDialog } from "@/components/ui/useDialog";
import { useToast } from "@/components/ui/Toast";
import type { AdminBrandRow } from "@/db/queries/admin";
import { cn } from "@/lib/cn";

type Editing = Omit<AdminBrandRow, "productCount">;
type FormState = (Editing & { mode: "edit" | "view" }) | null;

export function BrandsManager({
  rows,
  openNew = false,
  searchTerm = "",
  totalCount = rows.length,
}: {
  rows: AdminBrandRow[];
  openNew?: boolean;
  searchTerm?: string;
  totalCount?: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [form, setForm] = useState<FormState>(() =>
    openNew
      ? { id: 0, name: "", slug: "", accentHex: null, active: true, isOwnBrand: false, position: rows.length, mode: "edit" }
      : null,
  );
  const [target, setTarget] = useState<AdminBrandRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(() => rows.map((row) => row.id));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const orderRef = useRef(order);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    if (openNew) {
      setError(null);
      setForm({ id: 0, name: "", slug: "", accentHex: null, active: true, isOwnBrand: false, position: rows.length, mode: "edit" });
    }
  }, [openNew, rows.length]);

  useEffect(() => {
    const ids = rows.map((row) => row.id);
    setOrder(ids);
    orderRef.current = ids;
  }, [rows]);

  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = order.map((id) => byId.get(id)).filter((row): row is AdminBrandRow => Boolean(row));

  // El reordenamiento por drag solo tiene sentido cuando se ve la lista completa:
  // con una búsqueda activa los índices de la vista no coinciden con los de la DB.
  const dragEnabled = searchTerm.length === 0;

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: number) {
    event.preventDefault();
    if (byId.get(id)?.slug === "drei") return;
    setDraggingId(id);
    function move(pointer: PointerEvent) {
      const remaining = orderRef.current.filter((brandId) => brandId !== id);
      let index = remaining.length;
      for (let position = 0; position < remaining.length; position++) {
        const element = rowRefs.current.get(remaining[position]!);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (pointer.clientY < rect.top + rect.height / 2) { index = position; break; }
        }
      }
      if (remaining[0] && byId.get(remaining[0])?.slug === "drei") index = Math.max(1, index);
      const next = remaining.slice();
      next.splice(index, 0, id);
      if (next.join(",") !== orderRef.current.join(",")) { orderRef.current = next; setOrder(next); }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDraggingId(null);
      startTransition(async () => { const result = await reorderBrandsAction({ orderedIds: orderRef.current }); if (result.ok) { show("Orden de marcas actualizado."); router.refresh(); } else show(result.error, "error"); });
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function openEdit(row: AdminBrandRow) {
    setForm({ ...row, mode: "edit" });
  }
  function openView(row: AdminBrandRow) {
    setForm({ ...row, mode: "view" });
  }
  function close() { setForm(null); setError(null); router.replace("/admin/marcas"); }
  function save() {
    if (!form || form.mode === "view") return;
    const wasEditing = Boolean(form.id);
    startTransition(async () => {
      // El server decide el accentHex (fijo para DREI, null para marcas externas),
      // así que el cliente ya no lo envía: evita que un payload manipulado cambie
      // la identidad de la marca propia.
      const result = await saveBrandAction({ name: form.name, active: form.active }, form.id || undefined);
      if (!result.ok) { setError(result.error); return; }
      close(); show(`Marca ${wasEditing ? "actualizada" : "creada"}.`); router.refresh();
    });
  }
  function remove() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteBrandAction(target.id);
      if (!result.ok) { setError(result.error); setTarget(null); show(result.error, "error"); return; }
      setTarget(null); show("Marca eliminada."); router.refresh();
    });
  }

  const emptyMessage = searchTerm
    ? `Sin marcas que coincidan con “${searchTerm}”.`
    : "Todavía no hay marcas.";

  return <>
    <div className="admin-data-card border border-ink-700 bg-ink-850">
      <div className="hidden border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[28px_1.6fr_1fr_100px_90px_80px] lg:gap-3.5"><span /><span>Marca</span><span>Tipo</span><span>Productos</span><span>Estado</span><span /></div>
      {error && !form ? <p className="border-b border-ink-700 px-5 py-3 text-[12px] text-alert-soft">{error}</p> : null}
      {searchTerm ? <p className="border-b border-ink-700 px-5 py-2 text-[11px] text-content-dim">{ordered.length} de {totalCount} coinciden con “{searchTerm}”.</p> : null}
      {ordered.length === 0 ? <p className="px-5 py-12 text-center text-[13px] text-content-dim">{emptyMessage}</p> : null}
      {ordered.map((row) => {
        const isDrei = row.slug === "drei";
        return (
          <div key={row.id} ref={(element) => { if (element) rowRefs.current.set(row.id, element); else rowRefs.current.delete(row.id); }} className={cn("admin-data-row grid items-center gap-3.5 border-b border-line-soft px-5 py-3 lg:grid-cols-[28px_1.6fr_1fr_100px_90px_80px]", draggingId === row.id && "relative z-10 border-brand bg-[#171716] shadow-card")}>
            {isDrei || !dragEnabled
              ? <span className="hidden lg:block" />
              : <button type="button" onPointerDown={(event) => startDrag(event, row.id)} aria-label={`Reordenar ${row.name}`} className="hidden cursor-grab touch-none justify-center text-content-faint hover:text-brand lg:flex"><GripIcon /></button>}
            <div><p className="text-[13.5px] font-bold">{row.name}</p><p className="mt-0.5 text-[11px] text-content-faint">/{row.slug}</p></div>
            <span className={isDrei ? "text-[11px] font-extrabold uppercase tracking-[0.1em] text-drei-ink" : "text-[13px] text-content-muted"}>{isDrei ? "Marca propia oficial" : "Marca externa"}</span>
            <span className="text-[13.5px] font-extrabold tabular">{row.productCount}</span>
            <span className={row.active ? "text-[11px] uppercase text-state-ok" : "text-[11px] uppercase text-content-faint"}>{row.active ? "Visible" : "Oculta"}</span>
            <div className="flex justify-end gap-2">
              {isDrei ? (
                <button type="button" onClick={() => openView(row)} aria-label={`Ver detalle de ${row.name}`} title="Ver detalle" className="flex h-7 w-7 items-center justify-center text-content-muted hover:text-drei-ink"><EyeIcon size={16} /></button>
              ) : (
                <button type="button" onClick={() => openEdit(row)} aria-label={`Editar ${row.name}`} title="Editar" className="flex h-7 w-7 items-center justify-center text-content-muted hover:text-brand"><EditIcon size={16} /></button>
              )}
              {!isDrei ? <button type="button" onClick={() => setTarget(row)} aria-label={`Borrar ${row.name}`} title="Eliminar" className="flex h-7 w-7 items-center justify-center text-content-faint hover:text-alert"><TrashIcon size={16} /></button> : null}
            </div>
          </div>
        );
      })}
    </div>
    <BrandModal form={form} pending={pending} error={error} onChange={setForm} onClose={close} onSave={save} />
    <ConfirmModal open={Boolean(target)} title="Eliminar marca" description={target ? `¿Quieres eliminar “${target.name}”? Solo es posible si no tiene productos.` : ""} busy={pending} onClose={() => setTarget(null)} onConfirm={remove} />
  </>;
}

function BrandModal({
  form,
  pending,
  error,
  onChange,
  onClose,
  onSave,
}: {
  form: FormState;
  pending: boolean;
  error: string | null;
  onChange: (next: FormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const ref = useDialog(Boolean(form), onClose);
  if (!form) return null;
  const isDrei = form.slug === "drei";
  const viewOnly = form.mode === "view";
  const title = viewOnly ? "Detalle de la marca" : form.id ? "Editar marca" : "Nueva marca";
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#040404]/[0.78] backdrop-blur-[3px]">
        <div className="flex min-h-full items-center justify-center p-3 sm:p-6 md:p-10">
          <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="admin-modal w-full max-w-[600px] border border-line-strong bg-ink-850 animate-rise outline-none">
          <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
            <h2 className="font-display text-2xl uppercase skew-fast-6">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="text-content-dim hover:text-brand"><CloseIcon size={19} /></button>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <div className="grid gap-3.5 md:grid-cols-2">
              {viewOnly ? (
                <ReadOnlyField label="Nombre de la marca" value={form.name} className={isDrei ? undefined : "md:col-span-2"} />
              ) : (
                <Input
                  label="Nombre de la marca"
                  value={form.name}
                  className={cn("bg-[#0E0E0D]", !isDrei && "md:col-span-2")}
                  onChange={(event) => onChange({ ...form, name: event.target.value })}
                />
              )}
              {isDrei ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-content-dim">Color de acento</span>
                  <div className="flex items-center gap-2.5 border border-ink-700 bg-[#0E0E0D] px-3 py-2.5">
                    <span
                      aria-hidden
                      className="h-5 w-5 border border-line-strong"
                      style={{ backgroundColor: form.accentHex ?? "#1B3A5C" }}
                    />
                    <span className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-content">{form.accentHex ?? "#1B3A5C"}</span>
                    <span className="ml-auto text-[9px] font-extrabold uppercase tracking-[0.14em] text-content-faint">Fijo</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed text-content-faint">Identidad visual de la marca propia; no se edita desde el panel.</p>
                </div>
              ) : null}
              {isDrei ? (
                <div className="border border-drei-line/40 bg-drei/[0.08] p-3.5 md:col-span-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-drei-ink">Marca propia oficial · siempre visible</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-content-dim">DREI pertenece a GuanteArqueros. No puede ocultarse ni eliminarse y funciona independientemente de las categorías del catálogo.</p>
                </div>
              ) : viewOnly ? (
                <ReadOnlyField label="Estado en la tienda" value={form.active ? "Visible" : "Oculta"} className="md:col-span-2" />
              ) : (
                <div className="border border-ink-700 bg-[#0E0E0D] p-3.5 md:col-span-2">
                  <Toggle checked={form.active} label="Visible en la tienda" onChange={(active) => onChange({ ...form, active })} />
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-ink-700 px-6 py-5">
            {error ? <p className="mb-3 text-[12px] text-alert-soft">{error}</p> : null}
            <div className="flex justify-end gap-2.5">
              <button type="button" onClick={onClose} className="border border-line-strong px-4 py-2.5 text-[11px] uppercase text-content-muted">
                {viewOnly ? "Cerrar" : "Cancelar"}
              </button>
              {viewOnly ? null : (
                <button type="button" onClick={onSave} disabled={pending || form.name.trim().length < 2} className="bg-brand px-5 py-2.5 text-[11px] font-extrabold uppercase text-ink-950 disabled:bg-ink-700">
                  {pending ? "Guardando…" : "Guardar"}
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function ReadOnlyField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-content-dim">{label}</span>
      <div className="flex items-center border border-ink-700 bg-[#0E0E0D] px-3 py-2.5 text-[13px] text-content">
        {value}
      </div>
    </div>
  );
}
