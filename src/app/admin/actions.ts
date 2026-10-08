"use server";

import { eq, isNull, or, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/index";
import { brands, categories, inventoryMovements, productImages, productVariants, products } from "@/db/schema";
import { getHeroCarouselProducts } from "@/db/queries/catalog";
import { changeAdminPassword } from "@/db/queries/auth";
import { OrderError, setOrderStatus } from "@/db/queries/orders";
import { setCampaign, setCheckoutSettings, setContactSettings, setHomeSettings } from "@/db/queries/settings";
import { logoutAdmin, requireAdmin, requireAnyAdmin } from "@/lib/admin-auth";
import { CONTACT_SETTINGS_CACHE_TAG, PUBLIC_CATALOG_CACHE_TAG } from "@/lib/cache-tags";
import { toDbNumeric } from "@/lib/money";
import { isReservedCategorySlug, slugify } from "@/lib/slug";
import { SYSTEM_CATEGORY_SLUGS } from "@/lib/slug";
import {
  campaignSchema,
  brandSchema,
  changePasswordSchema,
  checkoutSettingsSchema,
  contactSettingsInputSchema,
  homeSettingsSchema,
  categorySchema,
  orderStatusSchema,
  productSchema,
  reorderCategoriesSchema,
  reorderBrandsSchema,
} from "@/lib/validators";

export type ActionResult = { ok: true } | { ok: false; error: string };

function invalidatePublicCatalog() {
  revalidateTag(PUBLIC_CATALOG_CACHE_TAG);
}

/**
 * Las server actions son endpoints públicos: cada una vuelve a verificar la
 * sesión, sin confiar en que el middleware ya filtró.
 */

export async function logoutAction() {
  await requireAnyAdmin();
  await logoutAdmin();
  redirect("/admin/login");
}

export async function logoutToStoreAction() {
  await requireAnyAdmin();
  await logoutAdmin();
  redirect("/?intro=admin");
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa las contraseñas." };
  }

  const result = await changeAdminPassword(
    session.uid,
    session.version,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) return result;

  await logoutAdmin();
  return { ok: true };
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
  if (!nextSlug) return { ok: false, error: "Usa letras o números en el nombre de la categoría." };

  let currentCategory: typeof categories.$inferSelect | undefined;
  if (id !== undefined) {
    currentCategory = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!currentCategory) return { ok: false, error: "La categoría ya no existe. Recarga la página." };
    if (SYSTEM_CATEGORY_SLUGS.has(currentCategory.slug)) {
      await db.update(categories).set({ active: values.active }).where(eq(categories.id, id));
      revalidatePath("/admin/categorias");
      revalidatePath("/", "layout");
      invalidatePublicCatalog();
      return { ok: true };
    }
  }
  // Los slugs históricos del seed incluyen el nombre del padre. Una edición
  // de visibilidad o imagen no debe cambiarles la URL accidentalmente.
  const finalSlug = currentCategory && currentCategory.name === values.name && currentCategory.parentId === values.parentId
    ? currentCategory.slug
    : nextSlug;
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

  // Toda categoría principal necesita una imagen propia: así se renderizan
  // correctamente las tarjetas del inicio y los encabezados de la tienda. Las
  // categorías del sistema (Ofertas, Nuevos) quedan excluidas porque ya se
  // atajaron arriba antes de llegar a este punto; las subcategorías tampoco
  // llevan imagen propia.
  if (values.parentId === null && !values.imagePath) {
    return {
      ok: false,
      error: "Agrega una imagen de la categoría antes de guardar.",
    };
  }

  // Un nivel: una subcategoría no puede colgar de otra subcategoría.
  if (values.parentId !== null) {
    const parent = await db.query.categories.findFirst({
      where: eq(categories.id, values.parentId),
    });
    if (!parent) return { ok: false, error: "La categoría padre no existe." };
    if (SYSTEM_CATEGORY_SLUGS.has(parent.slug)) {
      return { ok: false, error: `${parent.name} no admite subcategorías porque se completa automáticamente.` };
    }
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
    // La URL debe reflejar el nombre actual. Una subcategoría renombrada no
    // puede seguir reservando el slug anterior y bloquear una categoría nueva.
    if (id === undefined || currentCategory?.slug !== finalSlug) {
      const [owner] = await db.select({ id: categories.id, name: categories.name, parentId: categories.parentId })
        .from(categories).where(eq(categories.slug, finalSlug)).limit(1);
      if (owner && owner.id !== id) {
        const kind = owner.parentId === null ? "categoría" : "subcategoría";
        return { ok: false, error: `Ya existe una ${kind} (“${owner.name}”) que usa la URL /${finalSlug}.` };
      }
    }
    if (id === undefined) {
      // Nueva: se agrega al final de sus hermanas (mismo nivel) y el slug sale
      // del nombre. El orden real después se ajusta arrastrando la fila.
      const scope =
        values.parentId === null ? isNull(categories.parentId) : eq(categories.parentId, values.parentId);
      const [siblings] = await db.select({ n: sql<number>`count(*)::int` }).from(categories).where(scope);

      await db.insert(categories).values({
        name: values.name,
        slug: finalSlug,
        parentId: values.parentId,
        position: siblings?.n ?? 0,
        active: values.active,
        ...categoryImage,
      });
    } else {
      // Al renombrar también cambia el slug; las referencias a productos usan
      // IDs y siguen intactas. El orden se toca solo arrastrando la fila.
      await db
        .update(categories)
        .set({
          name: values.name,
          slug: finalSlug,
          parentId: values.parentId,
          active: values.active,
          ...categoryImage,
        })
        .where(eq(categories.id, id));
    }
  } catch (error) {
    console.error("[admin] saveCategory", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { ok: false, error: `Ya existe una categoría o subcategoría que usa la URL /${finalSlug}.` };
    }
    return { ok: false, error: "No se pudo guardar la categoría. Intenta de nuevo." };
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  invalidatePublicCatalog();
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
        const categoryId = incoming[i]!;
        const category = await tx.query.categories.findFirst({ where: eq(categories.id, categoryId) });
        const systemPosition = category?.slug === "nuevos" ? -2 : -1;
        await tx
          .update(categories)
          .set({ position: category && SYSTEM_CATEGORY_SLUGS.has(category.slug) ? systemPosition : i })
          .where(eq(categories.id, categoryId));
      }
    });

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  invalidatePublicCatalog();
  return { ok: true };
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  await requireAdmin();

  const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (category && SYSTEM_CATEGORY_SLUGS.has(category.slug)) {
    return { ok: false, error: `${category.name} es una categoría del sistema y no se puede eliminar. Puedes ocultarla desactivándola.` };
  }

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
  invalidatePublicCatalog();
  return { ok: true };
}

/* ── Marcas ─────────────────────────────────────────────────────────────── */

export async function saveBrandAction(input: unknown, id?: number): Promise<ActionResult> {
  await requireAdmin();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const values = parsed.data;
  let isDrei = false;
  let existingAccentHex: string | null = null;

  if (id !== undefined) {
    const [current] = await db
      .select({ slug: brands.slug, accentHex: brands.accentHex })
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);
    if (!current) return { ok: false, error: "La marca ya no existe. Recarga la página." };
    isDrei = current.slug === "drei";
    existingAccentHex = current.accentHex;
  } else if (slugify(values.name) === "drei") {
    return { ok: false, error: "DREI es la marca propia protegida y ya está configurada." };
  }

  try {
    await db.transaction(async (tx) => {
      if (isDrei) {
        await tx.update(brands).set({ isOwnBrand: false });
      }
      const data = {
        name: values.name,
        // DREI tiene paleta propia y permanente: ignoramos cualquier
        // accentHex que llegue del cliente y conservamos el guardado. Las
        // marcas externas no usan acento en la tienda, así que lo normalizamos
        // a null para no acumular datos muertos.
        accentHex: isDrei ? existingAccentHex : null,
        // DREI es la identidad propia permanente del negocio. Puede editarse
        // su nombre visible, pero nunca ocultarse accidentalmente.
        active: isDrei ? true : values.active,
        isOwnBrand: isDrei,
      };
      if (id === undefined) {
        const [count] = await tx.select({ n: sql<number>`count(*)::int` }).from(brands);
        await tx.insert(brands).values({ ...data, slug: slugify(values.name), position: count?.n ?? 0 });
      }
      else await tx.update(brands).set(data).where(eq(brands.id, id));
    });
  } catch (error) {
    console.error("[admin] saveBrand", error);
    return { ok: false, error: "Ya existe una marca con un nombre muy parecido." };
  }
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/productos");
  revalidatePath("/drei");
  revalidatePath("/", "layout");
  invalidatePublicCatalog();
  return { ok: true };
}

export async function deleteBrandAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  const [brand] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) return { ok: false, error: "La marca ya no existe." };
  if (brand.slug === "drei") return { ok: false, error: "DREI es la marca propia protegida y no se puede eliminar." };
  const [used] = await db.select({ id: products.id }).from(products).where(eq(products.brandId, id)).limit(1);
  if (used) return { ok: false, error: "Esta marca tiene productos. Cámbialos de marca antes de eliminarla." };
  await db.delete(brands).where(eq(brands.id, id));
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  invalidatePublicCatalog();
  return { ok: true };
}

export async function reorderBrandsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderBrandsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Orden inválido." };
  const current = await db.select({ id: brands.id, slug: brands.slug }).from(brands);
  const ids = new Set(current.map((brand) => brand.id));
  const incoming = parsed.data.orderedIds;
  if (incoming.length !== ids.size || !incoming.every((id) => ids.has(id))) {
    return { ok: false, error: "El orden no coincide con las marcas actuales. Recarga la página." };
  }
  const dreiId = current.find((brand) => brand.slug === "drei")?.id;
  const protectedOrder = dreiId === undefined
    ? incoming
    : [dreiId, ...incoming.filter((id) => id !== dreiId)];
  await db.transaction(async (tx) => {
    for (let position = 0; position < protectedOrder.length; position++) {
      await tx.update(brands).set({ position }).where(eq(brands.id, protectedOrder[position]!));
    }
  });
  revalidatePath("/admin/marcas");
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  invalidatePublicCatalog();
  return { ok: true };
}

/* ── Productos ────────────────────────────────────────────────────────────── */

export async function saveProductAction(input: unknown, id?: number): Promise<ActionResult> {
  const session = await requireAdmin();

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
    stock: v.variants.reduce((total, variant) => total + variant.stock, 0),
    sizes: v.variants.map((variant) => variant.size).filter(Boolean),
    attributes: v.attributes,
    customizable: v.customizable,
    published: v.published,
    featured: v.featured,
    isNew: v.isNew,
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
        if (v.variants.some((variant) => variant.expectedStock !== null)) throw new Error("Inventario inicial inválido.");
      } else {
        // Editar: el slug queda fijo para no romper la ficha ya publicada,
        // aunque el nombre cambie.
        const [existing] = await tx
          .select({ slug: products.slug })
          .from(products)
          .where(eq(products.id, target))
          .limit(1).for("update");
        if (!existing) throw new Error("producto no encontrado");
        finalSlug = existing.slug;
      }

      const current = await tx.select({ id: productVariants.id, size: productVariants.size, stock: productVariants.stock })
        .from(productVariants).where(eq(productVariants.productId, target)).for("update");
      const incoming = new Map(v.variants.map((variant) => [variant.size, variant]));
      for (const old of current) {
        const next = incoming.get(old.size);
        if (!next && old.stock > 0) throw new Error(`Primero deja en cero el stock de la talla ${old.size || "única"} antes de quitarla.`);
        if (next && next.expectedStock !== old.stock) throw new Error("El stock cambió mientras editabas. Cierra y vuelve a abrir el producto.");
      }
      const existingNames = new Set(current.map((variant) => variant.size));
      for (const next of v.variants) {
        if (!existingNames.has(next.size) && next.expectedStock !== null) throw new Error("La lista de tallas cambió mientras editabas. Vuelve a abrir el producto.");
      }
      for (const old of current) if (!incoming.has(old.size)) {
        await tx.delete(productVariants).where(eq(productVariants.id, old.id));
      }
      for (let position = 0; position < v.variants.length; position++) {
        const next = v.variants[position]!;
        const old = current.find((variant) => variant.size === next.size);
        if (old) {
          await tx.update(productVariants).set({ stock: next.stock, position }).where(eq(productVariants.id, old.id));
        } else {
          await tx.insert(productVariants).values({ productId: target, size: next.size, stock: next.stock, position });
        }
        const previous = old?.stock ?? 0;
        const delta = next.stock - previous;
        if (delta !== 0) {
          if (id !== undefined && delta < 0 && v.inventoryReason !== "adjustment") {
            throw new Error("Para quitar stock, selecciona «Corrección de conteo».");
          }
          await tx.insert(inventoryMovements).values({ productId: target, productName: v.name, size: next.size,
            previousStock: previous, delta, newStock: next.stock,
            reason: id === undefined ? "initial" : v.inventoryReason,
            note: null, adminUserId: session.uid });
        }
      }
      await tx.update(products).set(values).where(eq(products.id, target));

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
    invalidatePublicCatalog();
    return { ok: true };
  } catch (error) {
    console.error("[admin] saveProduct", error);
    if (error instanceof Error && /stock|talla|inventario|producto no encontrado/i.test(error.message)) return { ok: false, error: error.message };
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
  invalidatePublicCatalog();
  return { ok: true };
}

/* ── Pedidos ──────────────────────────────────────────────────────────────── */

export async function setOrderStatusAction(orderId: number, status: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = orderStatusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "Estado inválido." };

  try {
    await setOrderStatus(orderId, parsed.data.status);
  } catch (error) {
    return { ok: false, error: error instanceof OrderError ? error.message : "No pudimos actualizar el pedido." };
  }
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

export async function saveContactSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = contactSettingsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa el número de contacto." };
  }
  await setContactSettings(parsed.data);
  revalidateTag(CONTACT_SETTINGS_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/admin/ajustes");
  return { ok: true };
}

export async function saveHomeSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = homeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa la configuración del Inicio." };
  }

  if (parsed.data.heroProductId !== null) {
    const eligible = await getHeroCarouselProducts(parsed.data.heroSource, 6);
    if (!eligible.some((product) => product.id === parsed.data.heroProductId)) {
      return { ok: false, error: "El producto elegido ya no forma parte de las diapositivas disponibles." };
    }
  }

  await setHomeSettings(parsed.data);
  invalidatePublicCatalog();
  revalidatePath("/");
  revalidatePath("/admin/inicio");
  return { ok: true };
}
