import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, withFallback } from "../index";
import { brands, categories, productImages, products } from "../schema";

/** `categories` se une dos veces (categoría y subcategoría): hacen falta alias. */
const parentCategory = alias(categories, "cat");
const childCategory = alias(categories, "sub");

/* Modelos de vista: los componentes no dependen de la forma de las filas de Drizzle. */

export type ProductAttribute = { name: string; value: string };

export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  brandName: string | null;
  isDrei: boolean;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  imagePublicId: string | null;
  sizes: string[];
};

export type ProductDetail = ProductCard & {
  description: string;
  attributes: ProductAttribute[];
  categoryName: string;
  categorySlug: string;
  subcategoryName: string | null;
  subcategorySlug: string | null;
  images: { publicId: string; alt: string }[];
  updatedAt: Date;
};

export type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  position: number;
  productCount: number;
  children: CategoryNode[];
};

const DREI = "DREI";

/* Imagen principal por producto, como subconsulta reutilizable. */
const primaryImage = sql<string | null>`(
  SELECT pi.public_id FROM ${productImages} pi
  WHERE pi.product_id = ${products.id}
  ORDER BY pi.is_primary DESC, pi.position ASC, pi.id ASC
  LIMIT 1
)`;

const cardColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  brandName: brands.name,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  stock: products.stock,
  sizes: products.sizes,
  imagePublicId: primaryImage,
};

type CardRow = {
  id: number;
  slug: string;
  name: string;
  brandName: string | null;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  sizes: string[];
  imagePublicId: string | null;
};

function toCard(row: CardRow): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandName: row.brandName,
    isDrei: row.brandName === DREI,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    stock: row.stock,
    imagePublicId: row.imagePublicId,
    sizes: row.sizes ?? [],
  };
}

/* ── Categorías ───────────────────────────────────────────────────────────── */

/** Árbol de dos niveles con el conteo de productos publicados de cada rama. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  return withFallback<CategoryNode[]>([], async () => {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        position: categories.position,
      })
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.position), asc(categories.name));

    const counts = await db
      .select({
        categoryId: products.categoryId,
        subcategoryId: products.subcategoryId,
        n: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.published, true))
      .groupBy(products.categoryId, products.subcategoryId);

    const byCategory = new Map<number, number>();
    const bySubcategory = new Map<number, number>();
    for (const c of counts) {
      byCategory.set(c.categoryId, (byCategory.get(c.categoryId) ?? 0) + c.n);
      if (c.subcategoryId !== null) {
        bySubcategory.set(c.subcategoryId, (bySubcategory.get(c.subcategoryId) ?? 0) + c.n);
      }
    }

    const roots: CategoryNode[] = [];
    const nodes = new Map<number, CategoryNode>();
    for (const r of rows) {
      nodes.set(r.id, {
        id: r.id,
        name: r.name,
        slug: r.slug,
        position: r.position,
        productCount: byCategory.get(r.id) ?? bySubcategory.get(r.id) ?? 0,
        children: [],
      });
    }
    for (const r of rows) {
      const node = nodes.get(r.id);
      if (!node) continue;
      if (r.parentId === null) {
        roots.push(node);
      } else {
        const parent = nodes.get(r.parentId);
        if (parent) {
          node.productCount = bySubcategory.get(r.id) ?? 0;
          parent.children.push(node);
        }
      }
    }
    return roots;
  });
}

export async function getCategoryBySlug(slug: string) {
  return withFallback<{
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
  } | null>(null, async () => {
    const [row] = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.active, true)))
      .limit(1);
    return row ?? null;
  });
}

export async function getAllCategorySlugs(): Promise<
  { slug: string; parentSlug: string | null }[]
> {
  return withFallback<{ slug: string; parentSlug: string | null }[]>([], async () =>
    db
      .select({ slug: childCategory.slug, parentSlug: parentCategory.slug })
      .from(childCategory)
      .leftJoin(parentCategory, eq(parentCategory.id, childCategory.parentId))
      .where(eq(childCategory.active, true)),
  );
}

/* ── Marcas ───────────────────────────────────────────────────────────────── */

export async function getBrands() {
  return withFallback<{ id: number; name: string; slug: string; accentHex: string | null }[]>(
    [],
    async () =>
      db
        .select({
          id: brands.id,
          name: brands.name,
          slug: brands.slug,
          accentHex: brands.accentHex,
        })
        .from(brands)
        .orderBy(asc(brands.id)),
  );
}

/* ── Productos ────────────────────────────────────────────────────────────── */

export async function getFeaturedProducts(limit = 4): Promise<ProductCard[]> {
  return withFallback<ProductCard[]>([], async () => {
    const rows = await db
      .select(cardColumns)
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(eq(products.published, true), eq(products.featured, true)))
      .orderBy(desc(products.updatedAt))
      .limit(limit);
    return rows.map(toCard);
  });
}

export type CatalogFilters = {
  brandNames?: string[];
  sizes?: string[];
  maxPrice?: number;
  minPrice?: number;
};

export async function getProductsByCategory(
  categorySlug: string,
  subcategorySlug?: string,
  filters: CatalogFilters = {},
): Promise<ProductCard[]> {
  return withFallback<ProductCard[]>([], async () => {
    const target = subcategorySlug ?? categorySlug;
    const [cat] = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.slug, target), eq(categories.active, true)))
      .limit(1);
    if (!cat) return [];

    const scope =
      cat.parentId === null
        ? eq(products.categoryId, cat.id)
        : eq(products.subcategoryId, cat.id);

    const where = [eq(products.published, true), scope];
    if (filters.brandNames?.length) where.push(inArray(brands.name, filters.brandNames));
    if (filters.maxPrice !== undefined) {
      where.push(lte(products.price, filters.maxPrice.toFixed(2)));
    }
    if (filters.minPrice !== undefined) {
      where.push(gte(products.price, filters.minPrice.toFixed(2)));
    }
    if (filters.sizes?.length) {
      // `sizes` es text[]: se filtra por solapamiento con las tallas elegidas.
      where.push(sql`${products.sizes} && ${filters.sizes}::text[]`);
    }

    const rows = await db
      .select(cardColumns)
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(...where))
      .orderBy(desc(products.featured), asc(products.name));
    return rows.map(toCard);
  });
}

/** Rango de precios y tallas disponibles de una rama, para armar los filtros. */
export async function getCategoryFacets(categorySlug: string, subcategorySlug?: string) {
  return withFallback<{ sizes: string[]; brandNames: string[]; maxPrice: number }>(
    { sizes: [], brandNames: [], maxPrice: 900 },
    async () => {
      const target = subcategorySlug ?? categorySlug;
      const [cat] = await db
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.slug, target))
        .limit(1);
      if (!cat) return { sizes: [], brandNames: [], maxPrice: 900 };

      const scope =
        cat.parentId === null
          ? eq(products.categoryId, cat.id)
          : eq(products.subcategoryId, cat.id);

      const rows = await db
        .select({
          sizes: products.sizes,
          brandName: brands.name,
          price: products.price,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(products.published, true), scope));

      const sizes: string[] = [];
      const brandNames: string[] = [];
      let maxPrice = 0;
      for (const r of rows) {
        for (const s of r.sizes ?? []) if (!sizes.includes(s)) sizes.push(s);
        if (r.brandName && !brandNames.includes(r.brandName)) brandNames.push(r.brandName);
        maxPrice = Math.max(maxPrice, Number.parseFloat(r.price));
      }
      return {
        sizes,
        brandNames,
        maxPrice: Math.ceil((maxPrice || 900) / 10) * 10,
      };
    },
  );
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return withFallback<ProductDetail | null>(null, async () => {
    const [row] = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        brandName: brands.name,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stock: products.stock,
        sizes: products.sizes,
        attributes: products.attributes,
        updatedAt: products.updatedAt,
        categoryName: parentCategory.name,
        categorySlug: parentCategory.slug,
        subcategoryName: childCategory.name,
        subcategorySlug: childCategory.slug,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .innerJoin(parentCategory, eq(parentCategory.id, products.categoryId))
      .leftJoin(childCategory, eq(childCategory.id, products.subcategoryId))
      .where(and(eq(products.slug, slug), eq(products.published, true)))
      .limit(1);
    if (!row) return null;

    const images = await db
      .select({ publicId: productImages.publicId, alt: productImages.alt })
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(desc(productImages.isPrimary), asc(productImages.position), asc(productImages.id));

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      brandName: row.brandName,
      isDrei: row.brandName === DREI,
      price: row.price,
      compareAtPrice: row.compareAtPrice,
      stock: row.stock,
      sizes: row.sizes ?? [],
      attributes: row.attributes ?? [],
      imagePublicId: images[0]?.publicId ?? null,
      images,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      subcategoryName: row.subcategoryName,
      subcategorySlug: row.subcategorySlug,
      updatedAt: row.updatedAt,
    };
  });
}

export async function getAllProductSlugs(): Promise<string[]> {
  return withFallback<string[]>([], async () => {
    const rows = await db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.published, true));
    return rows.map((r) => r.slug);
  });
}

/** Categorías raíz para el nav del header. */
export async function getNavCategories() {
  return withFallback<{ name: string; slug: string }[]>([], async () =>
    db
      .select({ name: categories.name, slug: categories.slug })
      .from(categories)
      .where(and(isNull(categories.parentId), eq(categories.active, true)))
      .orderBy(asc(categories.position), asc(categories.name)),
  );
}
