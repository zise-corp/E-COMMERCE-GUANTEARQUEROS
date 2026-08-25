"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction, reorderCategoriesAction, saveCategoryAction } from "@/app/admin/actions";
import { Input, Select } from "@/components/ui/Field";
import { GripIcon } from "@/components/ui/Icons";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";
import type { AdminCategoryRow } from "@/db/queries/admin";

type Editing = {
  id?: number;
  name: string;
  parentId: number | null;
  active: boolean;
};

const blank: Editing = { name: "", parentId: null, active: true };

export function CategoriesManager({ rows }: { rows: AdminCategoryRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Editing>(blank);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function edit(row: { id: number; name: string }, parentId: number | null) {
    setForm({ id: row.id, name: row.name, parentId, active: true });
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const { id, ...values } = form;
      const result = await saveCategoryAction(values, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(blank);
      router.refresh();
    });
  }

  function remove(id: number, name: string) {
    if (!window.confirm(`¿Borrar "${name}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
      <CategoryTable rows={rows} onEdit={edit} onRemove={remove} />

      <div className="border border-ink-700 bg-ink-850 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
            {form.id ? "Editar categoría" : "Nueva categoría"}
          </h2>
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm(blank)}
              className="text-[11px] uppercase tracking-[0.1em] text-content-dim hover:text-brand"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="Nombre"
            placeholder="Ej. Medias"
            value={form.name}
            className="bg-[#0E0E0D]"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Select
            label="Categoría padre (opcional)"
            value={form.parentId === null ? "" : String(form.parentId)}
            className="bg-[#0E0E0D]"
            onChange={(e) =>
              setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">— Ninguna (categoría raíz)</option>
            {rows
              .filter((r) => r.id !== form.id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </Select>

          <div className="border border-ink-700 bg-[#0E0E0D] p-3.5">
            <Toggle
              checked={form.active}
              label="Visible en la tienda"
              onChange={(next) => setForm({ ...form, active: next })}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="border-l-[3px] border-alert bg-alert/10 px-3 py-2.5 text-[12px] text-alert-soft"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={save}
            disabled={pending || form.name.trim().length < 2}
            className="bg-brand px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
          >
            {pending ? "Guardando…" : form.id ? "Guardar cambios" : "Crear categoría"}
          </button>
          {!pending && form.name.trim().length < 2 ? (
            <p className="-mt-1.5 text-center text-[11px] text-content-faint">
              Escribí al menos 2 letras en el nombre para activar el botón.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Tabla de categorías raíz, reordenable por arrastre (como una lista de Spotify):
 * mantené apretada la agarradera y deslizá la fila arriba o abajo. Las demás se
 * corren solas para hacerle lugar; al soltar, se guarda el nuevo orden completo.
 *
 * Las categorías nuevas ya entran al final (lo decide el server, por orden de
 * creación) — este arrastre es para cuando después querés cambiar ese orden.
 */
function CategoryTable({
  rows,
  onEdit,
  onRemove,
}: {
  rows: AdminCategoryRow[];
  onEdit: (row: { id: number; name: string }, parentId: number | null) => void;
  onRemove: (id: number, name: string) => void;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<number[]>(() => rows.map((r) => r.id));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragError, setDragError] = useState<string | null>(null);

  const orderRef = useRef(order);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());

  // El server manda la verdad (por ejemplo tras crear o borrar una categoría):
  // el orden local se resincroniza cada vez que cambian las filas.
  useEffect(() => {
    const ids = rows.map((r) => r.id);
    setOrder(ids);
    orderRef.current = ids;
  }, [rows]);

  const [, startPersist] = useTransition();

  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = order.map((id) => byId.get(id)).filter((r): r is AdminCategoryRow => Boolean(r));

  function persistOrder(finalOrder: number[]) {
    setDragError(null);
    startPersist(async () => {
      const result = await reorderCategoriesAction({ orderedIds: finalOrder });
      if (!result.ok) {
        setDragError(result.error);
        const fallback = rows.map((r) => r.id);
        setOrder(fallback);
        orderRef.current = fallback;
      } else {
        router.refresh();
      }
    });
  }

  function onHandlePointerDown(e: React.PointerEvent<HTMLButtonElement>, id: number) {
    e.preventDefault();
    const startY = e.clientY;
    setDraggingId(id);
    setDragY(0);

    function move(ev: PointerEvent) {
      setDragY(ev.clientY - startY);

      const current = orderRef.current;
      const withoutDragged = current.filter((rid) => rid !== id);

      let insertAt = withoutDragged.length;
      for (let i = 0; i < withoutDragged.length; i++) {
        const el = rowRefs.current.get(withoutDragged[i]!);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientY < rect.top + rect.height / 2) {
          insertAt = i;
          break;
        }
      }

      const next = withoutDragged.slice();
      next.splice(insertAt, 0, id);

      if (next.join(",") !== current.join(",")) {
        orderRef.current = next;
        setOrder(next);
      }
    }

    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDraggingId(null);
      setDragY(0);
      persistOrder(orderRef.current);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="border border-ink-700 bg-ink-850">
      <div className="hidden gap-3.5 border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[28px_1.2fr_2fr_90px_80px]">
        <span />
        <span>Categoría</span>
        <span>Subcategorías</span>
        <span>Productos</span>
        <span />
      </div>

      {dragError ? (
        <p className="border-b border-ink-700 px-5 py-2.5 text-[12px] text-alert-soft">{dragError}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-content-dim">
          Todavía no hay categorías. Creá la primera con el panel de la derecha.
        </p>
      ) : null}

      {ordered.map((row) => {
        const isDragging = draggingId === row.id;
        return (
          <div
            key={row.id}
            ref={(el) => {
              if (el) rowRefs.current.set(row.id, el);
              else rowRefs.current.delete(row.id);
            }}
            style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
            className={cn(
              "grid items-center gap-3.5 border-b border-line-soft px-5 py-4 lg:grid-cols-[28px_1.2fr_2fr_90px_80px]",
              isDragging && "relative z-10 border-brand bg-[#171716] shadow-card",
            )}
          >
            <button
              type="button"
              onPointerDown={(e) => onHandlePointerDown(e, row.id)}
              aria-label={`Arrastrar para reordenar "${row.name}"`}
              className="hidden cursor-grab touch-none items-center justify-center self-stretch text-content-faint transition-colors duration-150 hover:text-brand active:cursor-grabbing lg:flex"
            >
              <GripIcon />
            </button>

            <div>
              <p className="text-sm font-bold">{row.name}</p>
              <p className="mt-0.5 text-[11px] text-content-faint">/{row.slug}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {row.subs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onEdit(s, row.id)}
                  className="border border-line-strong bg-[#0E0E0D] px-2.5 py-[5px] text-[11.5px] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
                >
                  {s.name}
                  <span className="ml-1.5 text-content-faint tabular">{s.productCount}</span>
                </button>
              ))}
              {row.subs.length === 0 ? (
                <span className="text-[11.5px] text-content-faint">Sin subcategorías</span>
              ) : null}
            </div>

            <span className="text-[13.5px] font-extrabold tabular">{row.productCount}</span>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onEdit(row, null)}
                className="text-[11.5px] text-content-muted transition-colors duration-150 hover:text-brand"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onRemove(row.id, row.name)}
                aria-label={`Borrar ${row.name}`}
                className="text-[11.5px] text-content-faint transition-colors duration-150 hover:text-alert"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
