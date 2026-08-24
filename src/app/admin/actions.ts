"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/index";
import { categories, productImages, products } from "@/db/schema";
import { setOrderStatus } from "@/db/queries/orders";
import { setCampaign } from "@/db/queries/settings";
import { logoutAdmin, requireAdmin } from "@/lib/admin-auth";
import { toDbNumeric } from "@/lib/money";
import {
  campaignSchema,
  categorySchema,
  orderStatusSchema,
  productSchema,
} from "@/lib/validators";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Las server actions son endpoints públicos: cada una vuelve a verificar la
 * sesión, sin confiar en que el middleware ya filtró.
 */

export async function logoutAction() {
  await requireAdmin();
  await logoutAdmin();
  redirect("/admin/login");
}

/* ── Categorías ───────────────────────────────────────────────────────────── */

export async function saveCategoryAction(
  input: unknown,
  id?: number,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const values = parsed.data;

  // Un nivel: una subcategoría no puede colgar de otra subcategoría.
  if (values.parentId !== null) {
    const parent = await db.query.categories.findFirst({
      where: eq(categories.id, values.parentId),
    });
    if (!parent) return { ok: false, error: "La categoría padre no existe." };
    if (parent.parentId !== null) {
      return { ok: false, error: "Solo se admiten dos niveles: categoría y subcategoría." };
    }
    if (id !== undefined && values.parentId === id) {
      return { ok: false, error: "Una categoría no puede ser su propio padre." };
    }
  }

  try {
    if (id === undefined) {
      await db.insert(categories).values(values);
    } else {
      await db.update(categories).set(values).where(eq(categories.id, id));
    }
  } catch (error) {
    console.error("[admin] saveCategory", error);
    return { ok: false, error: "Ese slug ya está en uso." };
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  await requireAdmin();

  const [used] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, id))
    .limit(1);

  if (used) {
    return {
      ok: false,
      error: "Hay productos en esta categoría. Movelos antes de borrarla.",
    };
  }

  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ── Productos ────────────────────────────────────────────────────────────── */

export async function saveProductAction(input: unknown, id?: number): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.path.join(".") || "Formulario"}: ${issue.message}` : "Datos inválidos.",
    };
  }

  const v = parsed.data;
  if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
    return { ok: false, error: "El precio anterior tiene que ser mayor al precio actual." };
  }

  const values = {
    name: v.name,
    slug: v.slug,
    description: v.description,
    categoryId: v.categoryId,
    subcategoryId: v.subcategoryId,
    brandId: v.brandId,
    price: toDbNumeric(v.price),
    compareAtPrice: v.compareAtPrice === null ? null : toDbNumeric(v.compareAtPrice),
    stock: v.stock,
    sizes: v.sizes,
    attributes: v.attributes,
    published: v.published,
    featured: v.featured,
    updatedAt: new Date(),
  };

  try {
    const productId = await db.transaction(async (tx) => {
      let target = id;
      if (target === undefined) {
        const [row] = await tx.insert(products).values(values).returning({ id: products.id });
        if (!row) throw new Error("insert sin retorno");
        target = row.id;
      } else {
        await tx.update(products).set(values).where(eq(products.id, target));
      }

      // Las imágenes se reemplazan enteras: el formulario manda la lista final.
      await tx.delete(productImages).where(eq(productImages.productId, target));
      if (v.images.length > 0) {
        await tx.insert(productImages).values(
          v.images.map((img, i) => ({
            productId: target as number,
            publicId: img.publicId,
            alt: img.alt || v.name,
            position: i,
            isPrimary: i === 0,
          })),
        );
      }
      return target;
    });

    revalidatePath("/admin/productos");
    revalidatePath(`/p/${v.slug}`);
    revalidatePath("/", "layout");
    void productId;
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveProduct", error);
    return { ok: false, error: "No se pudo guardar. ¿El slug ya existe?" };
  }
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  // order_items.product_id queda en NULL: el pedido histórico conserva el precio
  // y el nombre congelados.
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ── Pedidos ──────────────────────────────────────────────────────────────── */

export async function setOrderStatusAction(orderId: number, status: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = orderStatusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "Estado inválido." };

  await setOrderStatus(orderId, parsed.data.status);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  return { ok: true };
}

/* ── Campaña ──────────────────────────────────────────────────────────────── */

export async function saveCampaignAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await setCampaign(parsed.data);
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  return { ok: true };
}
