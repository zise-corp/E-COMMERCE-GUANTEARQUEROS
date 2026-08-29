"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteProductAction } from "@/app/admin/actions";
import { Chip } from "@/components/ui/Chip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { EditIcon, TrashIcon } from "@/components/ui/Icons";
import { Escudo } from "@/components/brand/Escudo";
import type { AdminProductDetail, AdminProductRow } from "@/db/queries/admin";
import { cn } from "@/lib/cn";
import { imageKitUrl } from "@/lib/images";
import { formatBs } from "@/lib/money";
import { ProductForm, type BrandOption, type CategoryOption } from "./ProductForm";

const LOW_STOCK = 5;

export function ProductsManager({
  rows,
  categories,
  brands,
  openNew,
}: {
  rows: AdminProductRow[];
  categories: CategoryOption[];
  brands: BrandOption[];
  openNew?: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [filter, setFilter] = useState<string>("Todos");
  const [formOpen, setFormOpen] = useState(Boolean(openNew));
  const [editing, setEditing] = useState<AdminProductDetail | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);
  const [deleting, startTransition] = useTransition();

  useEffect(() => {
    if (openNew) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [openNew]);

  const roots = categories.filter((c) => c.parentId === null);
  const visible = filter === "Todos" ? rows : rows.filter((r) => r.categoryName === filter);

  async function edit(id: number) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; product?: AdminProductDetail };
      if (data.ok && data.product) {
        setEditing(data.product);
        setFormOpen(true);
      } else show("No pudimos cargar el producto.", "error");
    } catch {
      show("No pudimos cargar el producto.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  function remove(row: AdminProductRow) {
    setDeleteTarget(row);
  }

  function confirmRemove() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProductAction(deleteTarget.id);
      if (!result.ok) { show(result.error, "error"); return; }
      setDeleteTarget(null);
      show("Producto eliminado.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="border border-ink-700 bg-ink-850">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-5 py-3">
          {["Todos", ...roots.map((c) => c.name)].map((label) => (
            <Chip key={label} active={filter === label} onClick={() => setFilter(label)}>
              {label}
            </Chip>
          ))}
        </div>

        <div className="hidden gap-3.5 border-b border-ink-700 px-5 py-3 text-[10.5px] uppercase tracking-[0.16em] text-content-dim lg:grid lg:grid-cols-[52px_2fr_1fr_1fr_90px_100px_100px]">
          <span />
          <span>Producto</span>
          <span>Categoría</span>
          <span>Marca</span>
          <span>Stock</span>
          <span>Precio</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-content-dim">
            No hay productos en esta categoría.
          </p>
        ) : null}

        {visible.map((p) => (
          <div
            key={p.id}
            className="grid items-center gap-3.5 border-b border-line-soft px-5 py-3 lg:grid-cols-[52px_2fr_1fr_1fr_90px_100px_100px]"
          >
            <div className="relative h-10 w-10 overflow-hidden bg-ink-950">
              {p.imagePublicId ? (
                <Image
                  src={imageKitUrl(p.imagePublicId, "thumb")}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Escudo width={16} height={19} className="opacity-20" title="" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold">
                {p.name}
                {!p.published ? (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-content-faint">
                    borrador
                  </span>
                ) : null}
                {p.featured ? (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-brand">
                    destacado
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] text-content-faint">
                GQ-{String(p.id).padStart(4, "0")} · {p.attributeCount}{" "}
                {p.attributeCount === 1 ? "atributo" : "atributos"}
              </p>
            </div>

            <span className="text-[13px] text-content-muted">{p.categoryName}</span>
            <span className="text-[13px] text-content-muted">{p.brandName ?? "—"}</span>
            <span
              className={cn(
                "text-[13px] font-bold tabular",
                p.stock <= LOW_STOCK ? "text-alert-soft" : "text-[#E9E7E4]",
              )}
            >
              {p.stock}
            </span>
            <span className="text-[13.5px] font-extrabold tabular">{formatBs(p.price)}</span>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => void edit(p.id)}
                disabled={loadingId === p.id}
                aria-label={`Editar ${p.name}`}
                title={`Editar ${p.name}`}
                className="flex h-7 w-7 items-center justify-center text-content-muted transition-colors duration-150 hover:text-brand disabled:opacity-50"
              >
                <EditIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label={`Borrar ${p.name}`}
                title={`Borrar ${p.name}`}
                className="flex h-7 w-7 items-center justify-center text-content-faint transition-colors duration-150 hover:text-alert"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => router.refresh()}
        product={editing}
        categories={categories}
        brands={brands}
      />
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Eliminar producto"
        description={deleteTarget ? `¿Quieres eliminar “${deleteTarget.name}”? Los pedidos existentes conservarán su nombre y precio.` : ""}
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
