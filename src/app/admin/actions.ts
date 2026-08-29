"use server";

import { eq, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/index";
import { brands, categories, productImages, products } from "@/db/schema";
import { setOrderStatus } from "@/db/queries/orders";
import { setCampaign, setCheckoutSettings } from "@/db/queries/settings";
import { logoutAdmin, requireAdmin } from "@/lib/admin-auth";
import { toDbNumeric } from "@/lib/money";
import { isReservedCategorySlug, slugify } from "@/lib/slug";
import {
  campaignSchema,
  brandSchema,
  checkoutSettingsSchema,
  categorySchema,
  orderStatusSchema,
  productSchema,
  reorderCategoriesSchema,
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
  const nextSlug = slugify(values.name);
  // Las subcategorías son navegación textual dentro de una categoría principal;
  // nunca conservan ni aceptan una imagen propia.
  const categoryImage = values.parentId === null
    ? { imagePath: values.imagePath, imageFileId: values.imageFileId }
    : { imagePath: null, imageFileId: null };

  if (values.parentId === null && isReservedCategorySlug(nextSlug)) {
    return {
      ok: false,
      error: `“${nextSlug}” es una ruta reservada del sistema. Usa otro nombre.`,
    };
  }

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
    if (id !== undefined) {
      const [child] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, id))
        .limit(1);
      const [assignedProduct] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.categoryId, id))
        .limit(1);
      if (child || assignedProduct) {
        return {
          ok: false,
          error: "Mueve primero sus productos y subcategorías antes de convertirla en subcategoría.",
        };
      }
    }
  }

  try {
    if (id === undefined) {
      // Nueva: se agrega al final de sus hermanas (mismo nivel) y el slug sale
      // del nombre. El orden real después se ajusta arrastrando la fila.
      const scope =
        values.parentId === null ? isNull(categories.parentId) : eq(categories.parentId, values.parentId);
      const [siblings] = await db.select({ n: sql<number>`count(*)::int` }).from(categories).where(scope);

      await db.insert(categories).values({
        name: values.name,
        slug: nextSlug,
        parentId: values.parentId,
        position: siblings?.n ?? 0,
        active: values.active,
        ...categoryImage,
      });
    } else {
      // Editar: el nombre y la visibilidad cambian. El slug queda fijo para no
      // romper la URL ya publicada, y el orden se toca solo arrastrando la fila.
      await db
        .update(categories)
        .set({
          name: values.name,
          parentId: values.parentId,
          active: values.active,
          ...categoryImage,
        })
        .where(eq(categories.id, id));
    }
  } catch (error) {
    console.error("[admin] saveCategory", error);
    return { ok: false, error: "Ya existe una categoría con un nombre muy parecido. Prueba con otro nombre." };
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Reordena las categorías raíz por arrastre. Recibe la lista completa de ids en
 * el nuevo orden y reasigna `position` = índice. Se valida que sean exactamente
 * las categorías raíz actuales, ni más ni menos, antes de tocar nada.
 */
export async function reorderCategoriesAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = reorderCategoriesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const current = await db.select({ id: categories.id }).from(categories).where(isNull(categories.parentId));
  const currentIds = new Set(current.map((c) => c.id));
  const incoming = parsed.data.orderedIds;

  const matches = incoming.length === currentIds.size && incoming.every((cid) => currentIds.has(cid));
  if (!matches) {
    return { ok: false, error: "El orden no coincide con las categorías actuales. Recarga la página." };
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < incoming.length; i++) {
      await tx.update(categories).set({ position: i }).where(eq(categories.id, incoming[i]!));
    }
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  await requireAdmin();

  const [used] = await db
    .select({ id: products.id })
    .from(products)
    .where(or(eq(products.categoryId, id), eq(products.subcategoryId, id)))
    .limit(1);

  if (used) {
    return {
      ok: false,
      error: "Hay productos en esta categoría. Muévelos antes de borrarla.",
    };
  }

  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ── Marcas ─────────────────────────────────────────────────────────────── */

export async function saveBrandAction(input: unknown, id?: number): Promise<ActionResult> {
  await requireAdmin();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const values = parsed.data;
  try {
    await db.transaction(async (tx) => {
      if (values.isOwnBrand) {
        await tx.update(brands).set({ isOwnBrand: false });
      }
      const data = {
        name: values.name,
        accentHex: values.accentHex,
        active: values.active,
        isOwnBrand: values.isOwnBrand,
      };
      if (id === undefined) await tx.insert(brands).values({ ...data, slug: slugify(values.name) });
      else await tx.update(brands).set(data).where(eq(brands.id, id));
    });
  } catch (error) {
    console.error("[admin] saveBrand", error);
    return { ok: false, error: "Ya existe una marca con un nombre muy parecido." };
  }
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteBrandAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  const [used] = await db.select({ id: products.id }).from(products).where(eq(products.brandId, id)).limit(1);
  if (used) return { ok: false, error: "Esta marca tiene productos. Cámbialos de marca antes de eliminarla." };
  await db.delete(brands).where(eq(brands.id, id));
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/productos");
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

  const selectedCategory = await db.query.categories.findFirst({
    where: eq(categories.id, v.categoryId),
  });
  if (!selectedCategory || selectedCategory.parentId !== null) {
    return { ok: false, error: "Elige una categoría principal válida." };
  }
  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, v.categoryId));
  if (children.length > 0 && v.subcategoryId === null) {
    return { ok: false, error: "Esta categoría requiere elegir una subcategoría." };
  }
  if (
    v.subcategoryId !== null &&
    !children.some((subcategory) => subcategory.id === v.subcategoryId)
  ) {
    return { ok: false, error: "La subcategoría no pertenece a la categoría seleccionada." };
  }

  const values = {
    name: v.name,
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
    const slug = await db.transaction(async (tx) => {
      let target = id;
      let finalSlug: string;

      if (target === undefined) {
        // Nuevo: el slug (la URL /p/...) sale del nombre.
        finalSlug = slugify(v.name);
        const [row] = await tx
          .insert(products)
          .values({ ...values, slug: finalSlug })
          .returning({ id: products.id });
        if (!row) throw new Error("insert sin retorno");
        target = row.id;
      } else {
        // Editar: el slug queda fijo para no romper la ficha ya publicada,
        // aunque el nombre cambie.
        const [existing] = await tx
          .select({ slug: products.slug })
          .from(products)
          .where(eq(products.id, target))
          .limit(1);
        if (!existing) throw new Error("producto no encontrado");
        finalSlug = existing.slug;
        await tx.update(products).set(values).where(eq(products.id, target));
      }

      // Las imágenes se reemplazan enteras: el formulario manda la lista final.
      await tx.delete(productImages).where(eq(productImages.productId, target));
      if (v.images.length > 0) {
        await tx.insert(productImages).values(
          v.images.map((img, i) => ({
            productId: target as number,
            publicId: img.publicId,
            fileId: img.fileId,
            alt: img.alt || v.name,
            position: i,
            isPrimary: i === 0,
          })),
        );
      }
      return finalSlug;
    });

    revalidatePath("/admin/productos");
    revalidatePath(`/p/${slug}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveProduct", error);
    return { ok: false, error: "Ya existe un producto con un nombre muy parecido. Prueba con otro nombre." };
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

export async function saveCheckoutSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = checkoutSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa la configuración." };
  }
  await setCheckoutSettings(parsed.data);
  revalidatePath("/admin/ajustes");
  revalidatePath("/checkout/envio");
  return { ok: true };
}
