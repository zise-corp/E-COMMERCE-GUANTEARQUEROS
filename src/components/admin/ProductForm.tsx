"use client";

import { useEffect, useState, useTransition } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { Toggle } from "@/components/ui/Toggle";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import type { AdminProductDetail } from "@/db/queries/admin";
import { slugify } from "@/lib/slug";
import { CloudinaryDropzone, type ProductImageValue } from "./CloudinaryDropzone";

export type CategoryOption = { id: number; name: string; parentId: number | null };
export type BrandOption = { id: number; name: string };

type FormState = {
  name: string;
  slug: string;
  description: string;
  categoryId: number | null;
  subcategoryId: number | null;
  brandId: number | null;
  price: string;
  compareAtPrice: string;
  stock: string;
  sizes: string;
  attributes: { name: string; value: string }[];
  images: ProductImageValue[];
  published: boolean;
  featured: boolean;
};

function toForm(product: AdminProductDetail | null, defaultCategoryId: number | null): FormState {
  if (!product) {
    return {
      name: "",
      slug: "",
      description: "",
      categoryId: defaultCategoryId,
      subcategoryId: null,
      brandId: null,
      price: "",
      compareAtPrice: "",
      stock: "0",
      sizes: "",
      attributes: [{ name: "", value: "" }],
      images: [],
      published: false,
      featured: false,
    };
  }
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    brandId: product.brandId,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? "",
    stock: String(product.stock),
    sizes: product.sizes.join(", "),
    attributes: product.attributes.length > 0 ? product.attributes : [{ name: "", value: "" }],
    images: product.images,
    published: product.published,
    featured: product.featured,
  };
}

export function ProductForm({
  open,
  onClose,
  onSaved,
  product,
  categories,
  brands,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: AdminProductDetail | null;
  categories: CategoryOption[];
  brands: BrandOption[];
}) {
  const roots = categories.filter((c) => c.parentId === null);
  const [form, setForm] = useState<FormState>(() => toForm(product, roots[0]?.id ?? null));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useDialog(open, onClose);

  useEffect(() => {
    if (open) {
      setForm(toForm(product, roots[0]?.id ?? null));
      setSlugTouched(Boolean(product));
      setError(null);
    }
    // Se re-arma solo al abrir o al cambiar de producto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  useEffect(() => {
    if (!slugTouched) setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, slugTouched]);

  if (!open) return null;

  const subs = categories.filter((c) => c.parentId === form.categoryId);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function setAttribute(index: number, key: "name" | "value", next: string) {
    setForm((f) => {
      const attributes = f.attributes.slice();
      const row = attributes[index];
      if (!row) return f;
      attributes[index] = { ...row, [key]: next };
      return { ...f, attributes };
    });
  }

  function save() {
    setError(null);

    const price = Number.parseFloat(form.price.replace(",", "."));
    const compareAt = form.compareAtPrice.trim()
      ? Number.parseFloat(form.compareAtPrice.replace(",", "."))
      : null;
    const stock = Number.parseInt(form.stock, 10);

    if (!Number.isFinite(price)) {
      setError("Poné un precio válido.");
      return;
    }
    if (form.categoryId === null) {
      setError("Elegí una categoría.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug,
      description: form.description.trim(),
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      brandId: form.brandId,
      price,
      compareAtPrice: compareAt,
      stock: Number.isFinite(stock) ? stock : 0,
      sizes: form.sizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      // Las filas vacías no se guardan: el admin puede dejar una a mano abierta.
      attributes: form.attributes.filter((a) => a.name.trim() && a.value.trim()),
      images: form.images,
      published: form.published,
      featured: form.featured,
    };

    startTransition(async () => {
      const result = await saveProductAction(payload, product?.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#040404]/[0.78] p-5 sm:p-10">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={product ? "Editar producto" : "Nuevo producto"}
          tabIndex={-1}
          className="mx-auto w-full max-w-[860px] border border-line-strong bg-ink-850 animate-rise outline-none"
        >
          <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
            <h2 className="font-display text-2xl uppercase skew-fast-6">
              {product ? "Editar producto" : "Nuevo producto"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1 text-lg leading-none text-content-dim transition-colors duration-150 hover:text-brand"
            >
              ✕
            </button>
          </div>

          <div className="grid items-start gap-6 p-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="flex flex-col gap-3.5">
              <Input
                label="Nombre del producto"
                value={form.name}
                className="bg-[#0E0E0D]"
                onChange={(e) => set("name", e.target.value)}
              />

              <Input
                label="Slug"
                value={form.slug}
                className="bg-[#0E0E0D]"
                hint={`/p/${form.slug || "…"}`}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Categoría"
                  value={form.categoryId === null ? "" : String(form.categoryId)}
                  className="bg-[#0E0E0D]"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoryId: e.target.value ? Number(e.target.value) : null,
                      subcategoryId: null,
                    }))
                  }
                >
                  <option value="">— Elegí una —</option>
                  {roots.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Subcategoría"
                  value={form.subcategoryId === null ? "" : String(form.subcategoryId)}
                  className="bg-[#0E0E0D]"
                  onChange={(e) =>
                    set("subcategoryId", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— Sin subcategoría —</option>
                  {subs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Precio Bs"
                  inputMode="decimal"
                  value={form.price}
                  className="bg-[#0E0E0D]"
                  onChange={(e) => set("price", e.target.value)}
                />
                <Input
                  label="Precio antes"
                  inputMode="decimal"
                  value={form.compareAtPrice}
                  className="bg-[#0E0E0D]"
                  hint="Opcional"
                  onChange={(e) => set("compareAtPrice", e.target.value)}
                />
                <Input
                  label="Stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  className="bg-[#0E0E0D]"
                  onChange={(e) => set("stock", e.target.value)}
                />
              </div>

              <Textarea
                label="Descripción"
                rows={3}
                value={form.description}
                className="bg-[#0E0E0D]"
                onChange={(e) => set("description", e.target.value)}
              />

              <Input
                label="Tallas"
                value={form.sizes}
                className="bg-[#0E0E0D]"
                placeholder="7, 8, 9, 10, 11"
                hint="Separadas por coma. Van aparte de los atributos porque afectan al carrito."
                onChange={(e) => set("sizes", e.target.value)}
              />

              <div className="border border-line-strong bg-[#0E0E0D] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[12.5px] font-extrabold uppercase tracking-[0.08em]">
                      Atributos manuales
                    </h3>
                    <p className="mt-[3px] text-[11.5px] text-content-dim">
                      Campo libre: escribís el nombre y el valor. Sin listas fijas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("attributes", [...form.attributes, { name: "", value: "" }])}
                    className="border border-brand px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand transition-colors duration-150 hover:bg-brand hover:text-ink-950"
                  >
                    + Atributo
                  </button>
                </div>

                <div className="mt-3.5 flex flex-col gap-2">
                  {form.attributes.map((a, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.4fr_34px] items-center gap-2">
                      <input
                        value={a.name}
                        onChange={(e) => setAttribute(i, "name", e.target.value)}
                        placeholder="Color"
                        aria-label={`Nombre del atributo ${i + 1}`}
                        className="w-full rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:shadow-focus"
                      />
                      <input
                        value={a.value}
                        onChange={(e) => setAttribute(i, "value", e.target.value)}
                        placeholder="Blanco con líneas negras"
                        aria-label={`Valor del atributo ${i + 1}`}
                        className="w-full rounded-sm border border-line-strong bg-ink-850 px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:shadow-focus"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "attributes",
                            form.attributes.length === 1
                              ? [{ name: "", value: "" }]
                              : form.attributes.filter((_, j) => j !== i),
                          )
                        }
                        aria-label={`Quitar atributo ${i + 1}`}
                        className="text-center text-[15px] text-content-faint transition-colors duration-150 hover:text-alert"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[11px] leading-relaxed text-content-faint">
                  Se guardan como JSONB en{" "}
                  <span className="text-content-muted">products.attributes</span> y se muestran en la
                  ficha en este mismo orden.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <CloudinaryDropzone
                slug={form.slug}
                value={form.images}
                onChange={(next) => set("images", next)}
              />

              <Select
                label="Marca"
                value={form.brandId === null ? "" : String(form.brandId)}
                className="bg-[#0E0E0D]"
                onChange={(e) => set("brandId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Sin marca —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>

              <div className="flex flex-col gap-3 border border-ink-700 bg-[#0E0E0D] p-3.5">
                <Toggle
                  checked={form.published}
                  label="Publicado en la tienda"
                  onChange={(next) => set("published", next)}
                />
                <Toggle
                  checked={form.featured}
                  label="Destacado en home"
                  onChange={(next) => set("featured", next)}
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
                disabled={pending}
                className="flex items-center justify-center gap-2.5 bg-brand px-4 py-[15px] text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
              >
                {pending ? <Spinner size={15} /> : null}
                {pending ? "Guardando…" : "Guardar producto"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-center text-[11.5px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:text-content"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
