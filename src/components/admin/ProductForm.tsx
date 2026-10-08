"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { TrashIcon } from "@/components/ui/Icons";
import { Toggle } from "@/components/ui/Toggle";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import { useToast } from "@/components/ui/Toast";
import type { AdminProductDetail } from "@/db/queries/admin";
import { slugify } from "@/lib/slug";
import { ImageKitDropzone, type ProductImageValue } from "./ImageKitDropzone";

export type CategoryOption = { id: number; name: string; parentId: number | null };
export type BrandOption = { id: number; name: string; isOwnBrand: boolean };
type InventoryReason = "restock" | "adjustment";

type FormState = {
  name: string;
  description: string;
  categoryId: number | null;
  subcategoryId: number | null;
  brandId: number | null;
  price: string;
  compareAtPrice: string;
  variants: { size: string; stock: string; expectedStock: number | null }[];
  inventoryReason: InventoryReason;
  attributes: { name: string; value: string }[];
  customizable: boolean;
  images: ProductImageValue[];
  published: boolean;
  featured: boolean;
  isNew: boolean;
};

function toForm(product: AdminProductDetail | null, defaultCategoryId: number | null): FormState {
  if (!product) {
    return {
      name: "",
      description: "",
      categoryId: defaultCategoryId,
      subcategoryId: null,
      brandId: null,
      price: "",
      compareAtPrice: "",
      variants: [{ size: "", stock: "0", expectedStock: null }],
      inventoryReason: "restock",
      attributes: [{ name: "", value: "" }],
      customizable: false,
      images: [],
      published: false,
      featured: false,
      isNew: false,
    };
  }
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    brandId: product.brandId,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? "",
    variants: product.variants.map((variant) => ({ ...variant, stock: String(variant.stock), expectedStock: variant.stock })),
    inventoryReason: "restock",
    attributes: product.attributes.length > 0 ? product.attributes : [{ name: "", value: "" }],
    customizable: product.customizable,
    images: product.images,
    published: product.published,
    featured: product.featured,
    isNew: product.isNew,
  };
}

function InventoryHistoryModal({ product, sizeFilter, onClose }: { product: AdminProductDetail; sizeFilter: string | null; onClose: () => void }) {
  const ref = useDialog(true, onClose);
  const movements = sizeFilter === null
    ? product.inventoryHistory
    : product.inventoryHistory.filter((movement) => movement.size === sizeFilter);
  const labels: Record<string, string> = {
    sale: "Venta", restock: "Reposición", adjustment: "Corrección de conteo",
    migration: "Migración", initial: "Stock inicial",
  };
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#040404]/[0.84] p-3 backdrop-blur-[3px] sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-history-title"
          tabIndex={-1}
          className="admin-modal w-full max-w-[760px] border border-line-strong bg-ink-850 animate-rise outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4 sm:px-6">
            <div>
              <h2 id="inventory-history-title" className="font-display text-2xl uppercase skew-fast-6">Historial de inventario</h2>
              <p className="mt-1 text-xs text-content-dim">{product.name}{sizeFilter !== null ? ` · ${sizeFilter || "Talla única"}` : ""}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar historial" className="p-1 text-lg leading-none text-content-dim hover:text-brand">✕</button>
          </div>
          <div className="max-h-[min(68vh,600px)] space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            {movements.length ? movements.map((movement) => (
              <div key={movement.id} className="border-b border-line pb-3 text-xs leading-relaxed text-content-dim">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-bold text-content">{movement.reason === "adjustment" && movement.note ? "Ajuste" : labels[movement.reason] ?? movement.reason} · {movement.size || "Talla única"}</span>
                  <time dateTime={movement.createdAt}>{new Date(movement.createdAt).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}</time>
                </div>
                <p className="mt-1">
                  <span className={movement.delta > 0 ? "font-bold text-brand" : "font-bold text-content"}>{movement.delta > 0 ? "+" : ""}{movement.delta}</span>
                  {` unidades · ${movement.previousStock} → ${movement.newStock}`}
                  {movement.adminUsername ? ` · ${movement.adminUsername}` : ""}
                  {movement.orderNumber ? ` · Pedido #${movement.orderNumber}` : ""}
                </p>
                {movement.note ? <p className="mt-1 text-content-muted">{movement.note}</p> : null}
              </div>
            )) : <p className="py-8 text-center text-sm text-content-faint">Aún no hay movimientos de inventario.</p>}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-ink-700 px-5 py-3 sm:px-6">
            <p className="text-[10px] text-content-faint">Se muestran hasta 100 movimientos recientes; los anteriores siguen guardados.</p>
            <button type="button" onClick={onClose} className="border border-brand px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-brand hover:bg-brand hover:text-ink-950">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type InventoryVariant = FormState["variants"][number];

function StockConfigModal({
  variants: initialVariants,
  initialReason,
  product,
  historyOpen,
  onClose,
  onApply,
  onHistory,
}: {
  variants: InventoryVariant[];
  initialReason: InventoryReason;
  product: AdminProductDetail | null;
  historyOpen: boolean;
  onClose: () => void;
  onApply: (variants: InventoryVariant[], reason: InventoryReason) => void;
  onHistory: (size: string, trigger: HTMLButtonElement) => void;
}) {
  const ref = useDialog(true, onClose, historyOpen);
  const [variants, setVariants] = useState(() => initialVariants.map((variant) => ({ ...variant })));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [sizeDraft, setSizeDraft] = useState("");
  const [reason, setReason] = useState<InventoryReason>(initialReason);
  const [error, setError] = useState<string | null>(null);
  const total = variants.reduce((sum, variant) => sum + Number(variant.stock), 0);

  function changeStock(index: number, direction: 1 | -1) {
    const variant = variants[index];
    if (!variant) return;
    const raw = amounts[variant.size] ?? "";
    if (!/^[1-9]\d*$/.test(raw) || Number(raw) > 100_000) {
      setError("Indica una cantidad entera entre 1 y 100.000.");
      return;
    }
    const amount = Number(raw);
    const next = Number(variant.stock) + direction * amount;
    if (next < 0) {
      setError(`La talla ${variant.size || "única"} solo tiene ${variant.stock} unidades disponibles.`);
      return;
    }
    if (next > 100_000 || total + direction * amount > 100_000) {
      setError("El stock por talla y el total no pueden superar 100.000 unidades.");
      return;
    }
    setVariants((current) => current.map((row, position) => position === index ? { ...row, stock: String(next) } : row));
    if (direction < 0 && product) setReason("adjustment");
    setAmounts((current) => ({ ...current, [variant.size]: "" }));
    setError(null);
  }

  function addSize() {
    const size = sizeDraft.trim();
    if (!size) return;
    if (size.length > 40 || variants.length >= 40) {
      setError("Cada talla puede tener hasta 40 caracteres y el producto hasta 40 tallas.");
      return;
    }
    if (variants.some((variant) => variant.size.toLocaleLowerCase("es") === size.toLocaleLowerCase("es"))) {
      setError("Esa talla ya fue agregada.");
      return;
    }
    const unique = variants.length === 1 && variants[0]?.size === "" ? variants[0] : null;
    if (unique && unique.expectedStock !== null && unique.expectedStock > 0) {
      setError("Para pasar de talla única a varias tallas, deja su stock en cero y guarda primero.");
      return;
    }
    setVariants(unique
      ? [{ size, stock: unique.stock, expectedStock: null }]
      : [...variants, { size, stock: "0", expectedStock: null }]);
    setSizeDraft("");
    setError(null);
  }

  function removeSize(index: number) {
    const variant = variants[index];
    if (!variant?.size) return;
    if (variant.expectedStock !== null && variant.expectedStock > 0) {
      setError("Primero deja en cero el stock de esa talla y guarda el producto antes de quitarla.");
      return;
    }
    const remaining = variants.filter((_, position) => position !== index);
    setVariants(remaining.length ? remaining : [{ size: "", stock: "0", expectedStock: null }]);
    setError(null);
  }

  function apply() {
    if (product && reason === "restock" && variants.some((variant) => variant.expectedStock !== null && Number(variant.stock) < variant.expectedStock)) {
      setError("Para quitar unidades, selecciona «Corrección de conteo».");
      return;
    }
    onApply(variants, reason);
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#040404]/[0.84] p-3 backdrop-blur-[3px] sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={ref}
          role="dialog"
          aria-modal={!historyOpen}
          aria-hidden={historyOpen}
          inert={historyOpen}
          aria-labelledby="stock-config-title"
          tabIndex={-1}
          className={`admin-modal w-full border border-line-strong bg-ink-850 animate-rise outline-none ${variants.length === 1 ? "max-w-[400px]" : variants.length === 2 ? "max-w-[620px]" : "max-w-[880px]"}`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4 sm:px-6">
            <div>
              <h2 id="stock-config-title" className="font-display text-2xl uppercase skew-fast-6">Configurar stock</h2>
              <p className="mt-1 text-xs text-content-dim">Agrega o quita unidades por talla. Total preparado: <strong className="text-brand">{total}</strong></p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar configuración de stock" className="p-1 text-lg leading-none text-content-dim hover:text-brand">✕</button>
          </div>

          <div className="max-h-[min(72vh,720px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start gap-3">
              {variants.map((variant, index) => (
                <div key={variant.size || "unique"} className="w-full border border-line-strong bg-ink-950 p-4 sm:w-[260px] sm:flex-none">
                  <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-content-dim">Talla</p>
                      <p className="mt-1 truncate text-xl font-extrabold text-content" title={variant.size || "Única"}>{variant.size || "Única"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-content-dim">Disponible</p>
                      <p className="mt-1 text-xl font-extrabold text-brand tabular">{variant.stock}</p>
                    </div>
                  </div>
                  {variant.expectedStock !== null && Number(variant.stock) !== variant.expectedStock ? (
                    <p className="mt-3 text-[11px] text-content-dim">Registrado: {variant.expectedStock} · Cambio pendiente: {Number(variant.stock) > variant.expectedStock ? "+" : ""}{Number(variant.stock) - variant.expectedStock}</p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    <Input
                      label={`Cantidad a mover · ${variant.size || "talla única"}`}
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      inputMode="numeric"
                      placeholder="Ej. 10"
                      value={amounts[variant.size] ?? ""}
                      className="bg-ink-850"
                      onChange={(event) => { setAmounts((current) => ({ ...current, [variant.size]: event.target.value })); setError(null); }}
                    />
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => changeStock(index, 1)} className="border border-brand bg-brand px-3 py-2.5 text-xs font-extrabold text-ink-950 transition-colors hover:bg-brand-hot">+ Agregar stock</button>
                      <button type="button" onClick={() => changeStock(index, -1)} className="border border-alert px-3 py-2.5 text-xs font-extrabold text-alert-soft transition-colors hover:bg-alert/10">− Quitar stock</button>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {product ? <button type="button" onClick={(event) => onHistory(variant.size, event.currentTarget)} className="text-[11px] font-bold text-content-dim hover:text-brand">Ver historial</button> : <span />}
                      {variant.size ? <button type="button" onClick={() => removeSize(index)} className="text-[11px] font-bold text-alert-soft hover:underline">Quitar talla</button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-line-strong bg-ink-950 p-4">
              <label htmlFor="stock-size-entry" className="label-xs text-content-dim">Agregar otra talla</label>
              <div className="mt-2 flex min-w-0 gap-2">
                <input id="stock-size-entry" value={sizeDraft} maxLength={40} placeholder="Ej. M, XL o 42" className="min-w-0 flex-1 border border-line-strong bg-ink-850 px-3.5 py-3 text-[13px] text-content outline-none placeholder:text-content-faint focus:border-brand" onChange={(event) => { setSizeDraft(event.target.value); setError(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSize(); } }} />
                <button type="button" onClick={addSize} disabled={!sizeDraft.trim()} className="shrink-0 border border-brand px-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand hover:bg-brand hover:text-ink-950 disabled:border-line-strong disabled:text-content-faint disabled:hover:bg-transparent">Agregar</button>
              </div>
              <p className="mt-2 text-[11px] text-content-faint">Sin tallas se usa una sola opción «Talla única».</p>
            </div>

            {product ? (
              <fieldset>
                <legend className="label-xs mb-2 text-content-dim">Tipo de movimiento</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([{ value: "restock", label: "Reposición" }, { value: "adjustment", label: "Corrección de conteo" }] as const).map((option) => (
                    <label key={option.value} className={`flex cursor-pointer items-center gap-2 border px-4 py-3 text-xs font-bold transition-colors ${reason === option.value ? "border-brand bg-brand/10 text-brand" : "border-line-strong bg-ink-950 text-content-dim hover:border-brand"}`}>
                      <input type="radio" name="inventory-reason" value={option.value} checked={reason === option.value} onChange={() => { setReason(option.value); setError(null); }} className="accent-brand" />
                      {option.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-content-dim">Si quitas unidades, se selecciona «Corrección de conteo». El movimiento se registra al guardar.</p>
              </fieldset>
            ) : <p className="border border-line-strong bg-ink-950 px-4 py-3 text-xs text-content-dim">Tipo de movimiento: <strong className="text-brand">Stock inicial</strong></p>}
            {error ? <p role="alert" className="border-l-[3px] border-alert bg-alert/10 px-3 py-2.5 text-xs text-alert-soft">{error}</p> : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 px-5 py-4 sm:px-6">
            <p className="text-[11px] text-content-dim">Los cambios se guardan al pulsar «Guardar producto» en el formulario.</p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="border border-line-strong px-4 py-2.5 text-xs font-bold text-content-dim hover:text-content">Cancelar</button>
              <button type="button" onClick={apply} className="bg-brand px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.08em] text-ink-950 hover:bg-brand-hot">Aplicar al formulario</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [error, setError] = useState<string | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySize, setHistorySize] = useState<string | null>(null);
  const stockTriggerRef = useRef<HTMLButtonElement>(null);
  const historyReturnRef = useRef<HTMLButtonElement | null>(null);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();
  const ref = useDialog(open, onClose, stockOpen || historyOpen);

  useEffect(() => {
    if (open) {
      setForm(toForm(product, roots[0]?.id ?? null));
      setError(null);
      setStockOpen(false);
      setHistoryOpen(false);
      setHistorySize(null);
    }
    // Se re-arma solo al abrir o al cambiar de producto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  if (!open) return null;

  // El slug (la URL /p/...) no se muestra ni se edita: lo calcula el server a
  // partir del nombre al crear, y queda fijo al editar. Acá solo hace falta una
  // carpeta para ImageKit — la real si el producto ya existe, o una vista
  // previa mientras se está creando (el server puede terminar en otra si el
  // nombre cambió justo antes de guardar; es solo organización, no la URL final).
  const folderSlug = product ? product.slug : slugify(form.name);

  const subs = categories.filter((c) => c.parentId === form.categoryId);

  // DREI no es una marca externa como Buffon o HO Soccer: es la línea propia
  // del negocio. La lógica de fondo sigue siendo la misma (brandId → la etiqueta
  // azul en la tienda), pero en el formulario se destaca aparte con su propio
  // switch en vez de mezclarse en el desplegable de marcas reales.
  const dreiBrand = brands.find((b) => b.isOwnBrand);
  const otherBrands = brands.filter((b) => !b.isOwnBrand);
  const isDrei = dreiBrand !== undefined && form.brandId === dreiBrand.id;

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

  function closeStock() {
    setStockOpen(false);
    window.requestAnimationFrame(() => stockTriggerRef.current?.focus());
  }

  function openHistory(size: string | null, trigger: HTMLButtonElement) {
    historyReturnRef.current = trigger;
    setHistorySize(size);
    setHistoryOpen(true);
  }

  function closeHistory() {
    setHistoryOpen(false);
    window.requestAnimationFrame(() => historyReturnRef.current?.focus());
  }

  function save() {
    setError(null);

    const price = Number.parseFloat(form.price.replace(",", "."));
    const compareAt = form.compareAtPrice.trim()
      ? Number.parseFloat(form.compareAtPrice.replace(",", "."))
      : null;
    if (form.variants.some((variant) => !/^(0|[1-9]\d*)$/.test(variant.stock) || Number(variant.stock) > 100_000)) {
      setError("Cada stock debe ser un número entero entre 0 y 100.000.");
      return;
    }

    if (!form.name.trim()) {
      setError("Pon un nombre para el producto.");
      return;
    }
    if (!Number.isFinite(price)) {
      setError("Pon un precio válido.");
      return;
    }
    if (form.categoryId === null) {
      setError("Elige una categoría.");
      return;
    }
    if (subs.length > 0 && form.subcategoryId === null) {
      setError("Elige una subcategoría para clasificar el producto.");
      return;
    }
    if (form.images.length === 0) {
      setError("Agrega al menos una imagen del producto antes de guardar.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      brandId: form.brandId,
      price,
      compareAtPrice: compareAt,
      variants: form.variants.map((variant) => ({ ...variant, stock: Number(variant.stock) })),
      inventoryReason: form.inventoryReason,
      // Las filas vacías no se guardan: el admin puede dejar una a mano abierta.
      attributes: form.attributes.filter((a) => a.name.trim() && a.value.trim()),
      customizable: form.customizable,
      images: form.images,
      published: form.published,
      featured: form.featured,
      isNew: form.isNew,
    };

    startTransition(async () => {
      const result = await saveProductAction(payload, product?.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      show(product ? "Producto actualizado." : "Producto creado.");
      onSaved();
      onClose();
    });
  }

  return (
    <Portal>
      <>
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#040404]/[0.78] backdrop-blur-[3px]">
        <div className="flex min-h-full items-center justify-center p-3 sm:p-6 md:p-10">
        <div
          ref={ref}
          role="dialog"
          aria-modal={!stockOpen && !historyOpen}
          aria-label={product ? "Editar producto" : "Nuevo producto"}
          aria-hidden={stockOpen || historyOpen}
          inert={stockOpen || historyOpen}
          tabIndex={-1}
          className="admin-modal w-full max-w-[860px] border border-line-strong bg-ink-850 animate-rise outline-none"
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

          <div className="grid items-start gap-6 p-4 sm:p-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="flex flex-col gap-3.5">
              <Input
                label="Nombre del producto"
                value={form.name}
                className="bg-[#0E0E0D]"
                onChange={(e) => set("name", e.target.value)}
              />

              <div className={subs.length > 0 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
                <Select
                  label="Categoría principal"
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
                  <option value="">— Elige una —</option>
                  {roots.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>

                {subs.length > 0 ? (
                  <Select
                    label="Subcategoría"
                    value={form.subcategoryId === null ? "" : String(form.subcategoryId)}
                    className="bg-[#0E0E0D]"
                    hint="Obligatoria para esta categoría."
                    onChange={(e) => set("subcategoryId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Selecciona dónde clasificarlo —</option>
                    {subs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>

              <Textarea
                label="Descripción"
                rows={3}
                value={form.description}
                className="bg-[#0E0E0D]"
                onChange={(e) => set("description", e.target.value)}
              />

              <div className="border border-line-strong bg-[#0E0E0D] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="label-xs text-content-dim">Inventario</p>
                    <p className="mt-1 text-2xl font-extrabold tabular text-brand">{form.variants.reduce((sum, variant) => sum + Number(variant.stock), 0)} <span className="text-sm font-medium text-content-dim">unidades en total</span></p>
                  </div>
                  <button ref={stockTriggerRef} type="button" onClick={() => setStockOpen(true)} className="border border-brand px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.08em] text-brand transition-colors hover:bg-brand hover:text-ink-950">Configurar stock</button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {form.variants.map((variant) => (
                    <div key={variant.size || "unique"} className="flex items-center justify-between gap-3 border border-line bg-ink-950 px-3 py-2.5 text-sm">
                      <span className="truncate font-bold text-content">{variant.size || "Talla única"}</span>
                      <span className="shrink-0 font-extrabold tabular text-brand">{variant.stock} <span className="text-[10px] font-medium text-content-dim">uds.</span></span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-content-faint">Las cantidades preparadas se registran al guardar el producto.</p>
                {product ? <button type="button" onClick={(event) => openHistory(null, event.currentTarget)} className="mt-3 text-[11px] font-bold text-content-dim hover:text-brand">Ver historial de inventario</button> : null}
              </div>

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
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_34px] items-center gap-2">
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
                        <TrashIcon size={15} className="mx-auto" />
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
              <div>
                <ImageKitDropzone
                  slug={folderSlug}
                  value={form.images}
                  onChange={(next) => set("images", next)}
                  squareCrop
                  required
                  label="Imágenes del producto · ImageKit"
                  cropEyebrow="Imagen de producto"
                />
                {form.images.length === 0 ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-alert-soft">
                    Es obligatorio subir al menos una imagen antes de guardar.
                  </p>
                ) : null}
              </div>

              {dreiBrand ? (
                <div className="border border-drei-line/40 bg-drei/[0.08] p-3.5">
                  <Toggle
                    checked={isDrei}
                    label={`Es un producto ${dreiBrand.name}`}
                    onChange={(on) => set("brandId", on ? dreiBrand.id : null)}
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-drei-ink/80">
                    {dreiBrand.name} es la línea propia del negocio: se muestra en
                    la tienda con su etiqueta azul.
                  </p>
                </div>
              ) : null}

              {!isDrei ? (
                <Select
                  label="Marca"
                  value={form.brandId === null ? "" : String(form.brandId)}
                  className="bg-[#0E0E0D]"
                  onChange={(e) => set("brandId", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Sin marca —</option>
                  {otherBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              ) : null}

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
                <Toggle
                  checked={form.isNew}
                  label="Marcar como producto nuevo"
                  onChange={(next) => set("isNew", next)}
                />
                <Toggle
                  checked={form.customizable}
                  label="Permite personalización"
                  onChange={(next) => set("customizable", next)}
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
      </div>
      {stockOpen ? (
        <StockConfigModal
          variants={form.variants}
          initialReason={form.inventoryReason}
          product={product}
          historyOpen={historyOpen}
          onClose={closeStock}
          onApply={(variants, inventoryReason) => {
            setForm((current) => ({ ...current, variants, inventoryReason }));
            closeStock();
          }}
          onHistory={(size, trigger) => openHistory(size, trigger)}
        />
      ) : null}
      {historyOpen && product ? (
        <InventoryHistoryModal product={product} sizeFilter={historySize} onClose={closeHistory} />
      ) : null}
      </>
    </Portal>
  );
}
