"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/actions";
import { Input, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import type { AdminCategoryRow } from "@/db/queries/admin";
import { slugify } from "@/lib/slug";

type Editing = {
  id?: number;
  name: string;
  slug: string;
  parentId: number | null;
  position: number;
  active: boolean;
};

const blank: Editing = { name: "", slug: "", parentId: null, position: 0, active: true };

export function CategoriesManager({ rows }: { rows: AdminCategoryRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Editing>(blank);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El slug se arma solo mientras nadie lo edite a mano.
  useEffect(() => {
    if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, slugTouched]);

  function edit(row: { id: number; name: string; slug: string; position?: number }, parentId: number | null) {
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId,
      position: row.position ?? 0,
      active: true,
    });
    setSlugTouched(true);
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
      setSlugTouched(false);
      router.refresh();
    });
  }

  function remove(id: number, name: string) {
    if (!window.confirm(`¿Borrar “${name}”? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const nextPosition = rows.length;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
      <div className="border border-ink-700 bg-ink-850">
        <div className="hidden gap-3.5 border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[1.2fr_2fr_90px_80px]">
          <span>Categoría</span>
          <span>Subcategorías</span>
          <span>Productos</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-content-dim">
            Todavía no hay categorías. Creá la primera con el panel de la derecha.
          </p>
        ) : null}

        {rows.map((row) => (
          <div
            key={row.id}
            className="grid items-center gap-3.5 border-b border-line-soft px-5 py-4 lg:grid-cols-[1.2fr_2fr_90px_80px]"
          >
            <div>
              <p className="text-sm font-bold">{row.name}</p>
              <p className="mt-0.5 text-[11px] text-content-faint">/{row.slug}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {row.subs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => edit(s, row.id)}
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
                onClick={() => edit(row, null)}
                className="text-[11.5px] text-content-muted transition-colors duration-150 hover:text-brand"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => remove(row.id, row.name)}
                aria-label={`Borrar ${row.name}`}
                className="text-[11.5px] text-content-faint transition-colors duration-150 hover:text-alert"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-ink-700 bg-ink-850 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
            {form.id ? "Editar categoría" : "Nueva categoría"}
          </h2>
          {form.id ? (
            <button
              type="button"
              onClick={() => {
                setForm(blank);
                setSlugTouched(false);
              }}
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

          <Input
            label="Slug"
            value={form.slug}
            className="bg-[#0E0E0D]"
            hint="Es lo que aparece en la URL: /c/medias"
            onChange={(e) => {
              setSlugTouched(true);
              setForm({ ...form, slug: slugify(e.target.value) });
            }}
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

          <Input
            label="Orden en la tienda"
            type="number"
            min={0}
            value={form.position}
            className="bg-[#0E0E0D]"
            placeholder={String(nextPosition)}
            onChange={(e) => setForm({ ...form, position: Number(e.target.value) || 0 })}
          />

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
        </div>
      </div>
    </div>
  );
}
