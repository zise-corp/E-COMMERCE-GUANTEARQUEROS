"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction } from "@/app/admin/actions";
import { Escudo } from "@/components/brand/Escudo";
import { ImageKitDropzone, type ProductImageValue } from "@/components/admin/ImageKitDropzone";
import { Input, Select } from "@/components/ui/Field";
import { CloseIcon, EditIcon, GripIcon, TrashIcon } from "@/components/ui/Icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Portal } from "@/components/ui/Portal";
import { Toggle } from "@/components/ui/Toggle";
import { useDialog } from "@/components/ui/useDialog";
import { useToast } from "@/components/ui/Toast";
import type { AdminCategoryRow } from "@/db/queries/admin";
import { cn } from "@/lib/cn";
import { imageKitUrl } from "@/lib/images";
import { slugify } from "@/lib/slug";
import { SYSTEM_CATEGORY_SLUGS } from "@/lib/slug";

type View = "principales" | "subcategorias";
type CategoryKind = "principal" | "subcategoria";
type SubcategoryRow = AdminCategoryRow["subs"][number] & { parentId: number; parentName: string };

type Editing = {
  id?: number;
  kind: CategoryKind;
  slug: string | null;
  name: string;
  parentId: number | null;
  active: boolean;
  highlighted: boolean;
  imagePath: string | null;
  imageFileId: string | null;
};

function blank(kind: CategoryKind, rows: AdminCategoryRow[]): Editing {
  return {
    kind,
    slug: null,
    name: "",
    parentId: kind === "subcategoria" ? rows[0]?.id ?? null : null,
    active: true,
    highlighted: true,
    imagePath: null,
    imageFileId: null,
  };
}

export function CategoriesManager({ rows, openNew, initialView = "principales" }: { rows: AdminCategoryRow[]; openNew?: CategoryKind | null; initialView?: View }) {
  const router = useRouter();
  const { show } = useToast();
  const view = initialView;
  const [form, setForm] = useState<Editing | null>(() => openNew ? blank(openNew, rows) : null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (openNew) {
      setError(null);
      setForm(blank(openNew, rows));
    }
  }, [openNew, rows]);

  const subcategories: SubcategoryRow[] = rows.flatMap((parent) =>
    parent.subs.map((subcategory) => ({ ...subcategory, parentId: parent.id, parentName: parent.name })),
  );

  function editPrincipal(row: AdminCategoryRow) {
    setError(null);
    setForm({ id: row.id, kind: "principal", slug: row.slug, name: row.name, parentId: null, active: row.active, highlighted: row.highlighted, imagePath: row.imagePath, imageFileId: row.imageFileId });
  }

  function editSubcategory(row: SubcategoryRow) {
    setError(null);
    setForm({ id: row.id, kind: "subcategoria", slug: row.slug, name: row.name, parentId: row.parentId, active: row.active, highlighted: row.highlighted, imagePath: null, imageFileId: null });
  }

  function save() {
    if (!form) return;
    const wasEditing = form.id !== undefined;
    const label = form.kind === "principal" ? "Categoría" : "Subcategoría";
    setError(null);
    startTransition(async () => {
      const result = await saveCategoryAction({
        name: form.name,
        parentId: form.kind === "principal" ? null : form.parentId,
        active: form.active,
        highlighted: form.highlighted,
        imagePath: form.kind === "principal" ? form.imagePath : null,
        imageFileId: form.kind === "principal" ? form.imageFileId : null,
      }, form.id);
      if (!result.ok) { setError(result.error); return; }
      setForm(null);
      show(`${label} ${wasEditing ? "actualizada" : "creada"}.`);
      router.replace(`/admin/categorias?vista=${view}`);
    });
  }

  function remove(id: number, name: string) {
    setDeleteTarget({ id, name });
  }

  function confirmRemove() {
    if (!deleteTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(deleteTarget.id);
      if (!result.ok) { setError(result.error); show(result.error, "error"); }
      else { setDeleteTarget(null); show("Clasificación eliminada."); router.refresh(); }
    });
  }

  return (
    <>
      <div className="admin-data-card border border-ink-700 bg-ink-850">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-5 py-3">
          <Tab active={view === "principales"} href="/admin/categorias?vista=principales">Categorías principales <span className="ml-1 tabular">{rows.length}</span></Tab>
          <Tab active={view === "subcategorias"} href="/admin/categorias?vista=subcategorias">Subcategorías <span className="ml-1 tabular">{subcategories.length}</span></Tab>
        </div>

        {error && !form ? <p className="border-b border-ink-700 px-5 py-3 text-[12px] text-alert-soft">{error}</p> : null}
        {view === "principales" ? <PrincipalTable rows={rows} onEdit={editPrincipal} onRemove={remove} /> : <SubcategoryTable rows={subcategories} onEdit={editSubcategory} onRemove={remove} />}
      </div>

      <CategoryFormModal form={form} roots={rows.filter((row) => !SYSTEM_CATEGORY_SLUGS.has(row.slug))} pending={pending} error={error} onChange={setForm} onClose={() => { setForm(null); setError(null); router.replace(`/admin/categorias?vista=${view}`); }} onSave={save} />
      <ConfirmModal open={Boolean(deleteTarget)} title="Eliminar clasificación" description={deleteTarget ? `¿Quieres eliminar “${deleteTarget.name}”? Esta acción no se puede deshacer.` : ""} busy={pending} onClose={() => setDeleteTarget(null)} onConfirm={confirmRemove} />
    </>
  );
}

function Tab({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return <Link href={href} className={cn("border px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors", active ? "border-brand bg-brand text-ink-950" : "border-line-strong text-content-muted hover:border-brand hover:text-brand")}>{children}</Link>;
}

function CategoryFormModal({ form, roots, pending, error, onChange, onClose, onSave }: { form: Editing | null; roots: AdminCategoryRow[]; pending: boolean; error: string | null; onChange: (next: Editing) => void; onClose: () => void; onSave: () => void }) {
  const ref = useDialog(Boolean(form), onClose);
  if (!form) return null;
  const isPrincipal = form.kind === "principal";
  const isSystemCategory = form.slug !== null && SYSTEM_CATEGORY_SLUGS.has(form.slug);
  const imageValue: ProductImageValue[] = form.imagePath ? [{ publicId: form.imagePath, fileId: form.imageFileId, alt: form.name }] : [];

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#040404]/[0.78] p-3 sm:p-10">
        <div ref={ref} role="dialog" aria-modal="true" aria-label={form.id ? "Editar clasificación" : "Nueva clasificación"} tabIndex={-1} className="admin-modal mx-auto w-full max-w-[680px] border border-line-strong bg-ink-850 animate-rise outline-none">
          <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">{isPrincipal ? "Categoría principal" : "Subcategoría"}</p><h2 className="mt-1 font-display text-2xl uppercase skew-fast-6">{form.id ? "Editar" : "Crear"} {isPrincipal ? "categoría" : "subcategoría"}</h2></div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 text-content-dim transition-colors hover:text-brand"><CloseIcon size={19} /></button>
          </div>

          <div className={cn("grid items-start gap-5 p-4 sm:p-6", isPrincipal && "md:grid-cols-[1fr_0.9fr]")}>
            <div className="flex flex-col gap-3.5">
              <Input label={isPrincipal ? "Nombre de la categoría" : "Nombre de la subcategoría"} placeholder={isPrincipal ? "Ej. Accesorios" : "Ej. Entrenamiento"} value={form.name} disabled={isSystemCategory} className="bg-[#0E0E0D]" onChange={(event) => onChange({ ...form, name: event.target.value })} />
              {!isPrincipal ? (
                <Select label="Ubicar dentro de" value={form.parentId === null ? "" : String(form.parentId)} className="bg-[#0E0E0D]" hint="Organizará los productos dentro de esta categoría." onChange={(event) => onChange({ ...form, parentId: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">— Selecciona una categoría —</option>{roots.map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}
                </Select>
              ) : <p className="border-l-2 border-brand bg-brand/[0.06] px-3 py-2.5 text-[11.5px] leading-relaxed text-content-muted">{isSystemCategory ? (form.slug === "ofertas" ? "Categoría automática del sistema. Reúne los productos publicados cuyo precio anterior es mayor al actual; únicamente puedes controlar su visibilidad." : "Categoría automática del sistema. Reúne los productos publicados que marques como nuevos; únicamente puedes controlar su visibilidad.") : "Aparecerá en el menú principal y en las tarjetas de categorías de la tienda."}</p>}
              <div className="border border-ink-700 bg-[#0E0E0D] p-3.5"><Toggle checked={form.active} label="Visible en la tienda" onChange={(active) => onChange({ ...form, active })} /></div>
              {isSystemCategory ? <div className="border border-ink-700 bg-[#0E0E0D] p-3.5"><Toggle checked={form.highlighted} label="Resaltar en la tienda" onChange={(highlighted) => onChange({ ...form, highlighted })} /></div> : null}
            </div>

            {isPrincipal && !isSystemCategory ? <ImageKitDropzone slug={form.slug ?? slugify(form.name)} value={imageValue} onChange={(next) => { const image = next[0]; onChange({ ...form, imagePath: image?.publicId ?? null, imageFileId: image?.fileId ?? null }); }} folder="/guantearqueros/categorias" maxImages={1} label="Imagen de categoría · ImageKit" assetTag="categoria" squareCrop /> : null}
          </div>

          <div className="border-t border-ink-700 px-6 py-5">
            {error ? <p role="alert" className="mb-3 border-l-[3px] border-alert bg-alert/10 px-3 py-2.5 text-[12px] text-alert-soft">{error}</p> : null}
            <div className="flex justify-end gap-2.5"><button type="button" onClick={onClose} className="border border-line-strong px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-content-muted hover:border-content-dim">Cancelar</button><button type="button" onClick={onSave} disabled={pending || form.name.trim().length < 2 || (!isPrincipal && form.parentId === null)} className="bg-brand px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint">{pending ? "Guardando…" : "Guardar"}</button></div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function PrincipalTable({ rows, onEdit, onRemove }: { rows: AdminCategoryRow[]; onEdit: (row: AdminCategoryRow) => void; onRemove: (id: number, name: string) => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [order, setOrder] = useState(() => rows.map((row) => row.id));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const orderRef = useRef(order);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const [, startPersist] = useTransition();

  useEffect(() => { const ids = rows.map((row) => row.id); setOrder(ids); orderRef.current = ids; }, [rows]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = order.map((id) => byId.get(id)).filter((row): row is AdminCategoryRow => Boolean(row));

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: number) {
    event.preventDefault(); setDraggingId(id);
    function move(pointer: PointerEvent) {
      const remaining = orderRef.current.filter((rowId) => rowId !== id); let index = remaining.length;
      for (let position = 0; position < remaining.length; position++) { const element = rowRefs.current.get(remaining[position]!); if (element) { const rect = element.getBoundingClientRect(); if (pointer.clientY < rect.top + rect.height / 2) { index = position; break; } } }
      const next = remaining.slice(); next.splice(index, 0, id); if (next.join(",") !== orderRef.current.join(",")) { orderRef.current = next; setOrder(next); }
    }
    function up() { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setDraggingId(null); startPersist(async () => { const result = await reorderCategoriesAction({ orderedIds: orderRef.current }); if (result.ok) { show("Orden de categorías actualizado."); router.refresh(); } else show(result.error, "error"); }); }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  return <div>
    <div className="hidden border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[28px_52px_1.5fr_1fr_90px_80px] lg:gap-3.5"><span /><span /><span>Categoría principal</span><span>Subcategorías</span><span>Productos</span><span /></div>
    {ordered.length === 0 ? <p className="px-5 py-12 text-center text-[13px] text-content-dim">Todavía no hay categorías principales.</p> : null}
    {ordered.map((row) => <div key={row.id} ref={(element) => { if (element) rowRefs.current.set(row.id, element); else rowRefs.current.delete(row.id); }} className={cn("admin-data-row grid items-center gap-3.5 border-b border-line-soft px-5 py-3 lg:grid-cols-[28px_52px_1.5fr_1fr_90px_80px]", draggingId === row.id && "relative z-10 border-brand bg-[#171716] shadow-card")}>
      {SYSTEM_CATEGORY_SLUGS.has(row.slug) ? <span /> : <button type="button" onPointerDown={(event) => startDrag(event, row.id)} aria-label={`Reordenar ${row.name}`} className="hidden cursor-grab touch-none justify-center text-content-faint hover:text-brand lg:flex"><GripIcon /></button>}
      <div className="relative h-10 w-10 overflow-hidden bg-ink-950">{row.imagePath ? <Image src={imageKitUrl(row.imagePath, "thumb")} alt="" fill sizes="40px" className="object-cover" /> : <span className="flex h-full w-full items-center justify-center"><Escudo width={16} height={19} className="opacity-20" title="" /></span>}</div>
      <div className="min-w-0"><p className="truncate text-[13.5px] font-bold">{row.name}{!row.active ? <span className="ml-2 text-[9.5px] uppercase tracking-[0.12em] text-content-faint">oculta</span> : null}</p><p className="mt-0.5 text-[11px] text-content-faint">/{row.slug}</p></div>
      <span className="text-[13px] text-content-muted">{SYSTEM_CATEGORY_SLUGS.has(row.slug) ? "Automática" : row.subs.length}</span><span className="text-[13.5px] font-extrabold tabular">{row.productCount}</span><Actions name={row.name} onEdit={() => onEdit(row)} onRemove={SYSTEM_CATEGORY_SLUGS.has(row.slug) ? undefined : () => onRemove(row.id, row.name)} />
    </div>)}</div>;
}

function SubcategoryTable({ rows, onEdit, onRemove }: { rows: SubcategoryRow[]; onEdit: (row: SubcategoryRow) => void; onRemove: (id: number, name: string) => void }) {
  return <div>
    <div className="hidden border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[1.5fr_1.3fr_90px_80px] lg:gap-3.5"><span>Subcategoría</span><span>Dentro de</span><span>Productos</span><span /></div>
    {rows.length === 0 ? <p className="px-5 py-12 text-center text-[13px] text-content-dim">Todavía no hay subcategorías. Créala desde el botón superior.</p> : null}
    {rows.map((row) => <div key={row.id} className="grid items-center gap-3.5 border-b border-line-soft px-5 py-4 lg:grid-cols-[1.5fr_1.3fr_90px_80px]">
      <div className="min-w-0"><p className="truncate text-[13.5px] font-bold">{row.name}{!row.active ? <span className="ml-2 text-[9.5px] uppercase tracking-[0.12em] text-content-faint">oculta</span> : null}</p><p className="mt-0.5 text-[11px] text-content-faint">/{row.slug}</p></div><span className="text-[13px] text-content-muted">{row.parentName}</span><span className="text-[13.5px] font-extrabold tabular">{row.productCount}</span><Actions name={row.name} onEdit={() => onEdit(row)} onRemove={() => onRemove(row.id, row.name)} />
    </div>)}</div>;
}

function Actions({ name, onEdit, onRemove }: { name: string; onEdit: () => void; onRemove?: () => void }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onEdit} aria-label={`Editar ${name}`} title={`Editar ${name}`} className="flex h-7 w-7 items-center justify-center text-content-muted transition-colors hover:text-brand"><EditIcon size={16} /></button>{onRemove ? <button type="button" onClick={onRemove} aria-label={`Borrar ${name}`} title={`Borrar ${name}`} className="flex h-7 w-7 items-center justify-center text-content-faint transition-colors hover:text-alert"><TrashIcon size={16} /></button> : null}</div>;
}
