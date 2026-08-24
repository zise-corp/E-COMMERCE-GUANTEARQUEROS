import "server-only";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../index";
import {
  brands,
  categories,
  orderItems,
  orders,
  productImages,
  products,
} from "../schema";

const parentCategory = alias(categories, "cat");
const childCategory = alias(categories, "sub");

const LOW_STOCK = 5;

/* ── Badges del sidebar ───────────────────────────────────────────────────── */

export async function getAdminCounts() {
  const [cats] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .where(isNull(categories.parentId));

  const [prods] = await db.select({ n: sql<number>`count(*)::int` }).from(products);

  const [nuevos] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "recibido"));

  return {
    categories: cats?.n ?? 0,
    products: prods?.n ?? 0,
    newOrders: nuevos?.n ?? 0,
  };
}

/* ── Resumen ──────────────────────────────────────────────────────────────── */

export type DashboardData = {
  kpis: {
    monthSales: string;
    monthOrders: number;
    averageTicket: string;
    lowStock: number;
    salesDelta: number | null;
    ordersLastWeek: number;
  };
  weeklySales: { label: string; total: number }[];
  byStatus: { status: string; n: number }[];
  topProducts: { name: string; units: number }[];
};

export async function getDashboard(): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 3600 * 1000);

  const [thisMonth] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${orders.total}), 0)::text`,
      n: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, monthStart), eq(orders.paymentStatus, "pagado")));

  const [prevMonth] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)::text` })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, prevMonthStart),
        lte(orders.createdAt, monthStart),
        eq(orders.paymentStatus, "pagado"),
      ),
    );

  const [lastWeek] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(gte(orders.createdAt, weekAgo));

  const [low] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(lte(products.stock, LOW_STOCK), eq(products.published, true)));

  const weekly = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${orders.createdAt}), 'YYYY-MM-DD')`,
      total: sql<number>`COALESCE(SUM(${orders.total}), 0)::float`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, twelveWeeksAgo), eq(orders.paymentStatus, "pagado")))
    .groupBy(sql`date_trunc('week', ${orders.createdAt})`)
    .orderBy(sql`date_trunc('week', ${orders.createdAt})`);

  const byStatus = await db
    .select({ status: orders.status, n: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status);

  const top = await db
    .select({
      name: orderItems.name,
      units: sql<number>`SUM(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orders.paymentStatus, "pagado"))
    .groupBy(orderItems.name)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(5);

  const monthSales = thisMonth?.total ?? "0";
  const monthOrders = thisMonth?.n ?? 0;
  const prev = Number.parseFloat(prevMonth?.total ?? "0");
  const current = Number.parseFloat(monthSales);

  // Las últimas 12 semanas, con cero en las que no hubo ventas.
  const buckets = new Map(weekly.map((w) => [w.week, w.total]));
  const weeklySales: { label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 7 * 24 * 3600 * 1000);
    const monday = new Date(day);
    monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    weeklySales.push({ label: `S${12 - i}`, total: buckets.get(key) ?? 0 });
  }

  return {
    kpis: {
      monthSales,
      monthOrders,
      averageTicket: monthOrders > 0 ? (current / monthOrders).toFixed(2) : "0",
      lowStock: low?.n ?? 0,
      salesDelta: prev > 0 ? Math.round(((current - prev) / prev) * 100) : null,
      ordersLastWeek: lastWeek?.n ?? 0,
    },
    weeklySales,
    byStatus,
    topProducts: top,
  };
}

/* ── Categorías ───────────────────────────────────────────────────────────── */

export type AdminCategoryRow = {
  id: number;
  name: string;
  slug: string;
  position: number;
  active: boolean;
  productCount: number;
  subs: { id: number; name: string; slug: string; productCount: number }[];
};

export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));

  const counts = await db
    .select({
      categoryId: products.categoryId,
      subcategoryId: products.subcategoryId,
      n: sql<number>`count(*)::int`,
    })
    .from(products)
    .groupBy(products.categoryId, products.subcategoryId);

  const byCategory = new Map<number, number>();
  const bySub = new Map<number, number>();
  for (const c of counts) {
    byCategory.set(c.categoryId, (byCategory.get(c.categoryId) ?? 0) + c.n);
    if (c.subcategoryId !== null) bySub.set(c.subcategoryId, (bySub.get(c.subcategoryId) ?? 0) + c.n);
  }

  return rows
    .filter((r) => r.parentId === null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      position: r.position,
      active: r.active,
      productCount: byCategory.get(r.id) ?? 0,
      subs: rows
        .filter((s) => s.parentId === r.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          productCount: bySub.get(s.id) ?? 0,
        })),
    }));
}

/* ── Productos ────────────────────────────────────────────────────────────── */

export type AdminProductRow = {
  id: number;
  name: string;
  slug: string;
  categoryName: string;
  brandName: string | null;
  stock: number;
  price: string;
  attributeCount: number;
  published: boolean;
  featured: boolean;
  imagePublicId: string | null;
};

export async function getAdminProducts(categoryId?: number): Promise<AdminProductRow[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      categoryName: parentCategory.name,
      brandName: brands.name,
      stock: products.stock,
      price: products.price,
      attributes: products.attributes,
      published: products.published,
      featured: products.featured,
      imagePublicId: sql<string | null>`(
        SELECT pi.public_id FROM ${productImages} pi
        WHERE pi.product_id = ${products.id}
        ORDER BY pi.is_primary DESC, pi.position ASC, pi.id ASC
        LIMIT 1
      )`,
    })
    .from(products)
    .innerJoin(parentCategory, eq(parentCategory.id, products.categoryId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(categoryId ? eq(products.categoryId, categoryId) : undefined)
    .orderBy(asc(products.stock), asc(products.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    categoryName: r.categoryName,
    brandName: r.brandName,
    stock: r.stock,
    price: r.price,
    attributeCount: (r.attributes ?? []).length,
    published: r.published,
    featured: r.featured,
    imagePublicId: r.imagePublicId,
  }));
}

export type AdminProductDetail = {
  id: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  subcategoryId: number | null;
  brandId: number | null;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  sizes: string[];
  attributes: { name: string; value: string }[];
  published: boolean;
  featured: boolean;
  images: { publicId: string; alt: string }[];
};

export async function getAdminProduct(id: number): Promise<AdminProductDetail | null> {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return null;

  const images = await db
    .select({ publicId: productImages.publicId, alt: productImages.alt })
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(desc(productImages.isPrimary), asc(productImages.position), asc(productImages.id));

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    brandId: row.brandId,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    stock: row.stock,
    sizes: row.sizes ?? [],
    attributes: row.attributes ?? [],
    published: row.published,
    featured: row.featured,
    images,
  };
}

/** Categorías planas para los selects del formulario. */
export async function getCategoryOptions() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));

  return {
    roots: rows.filter((r) => r.parentId === null),
    subs: rows.filter((r) => r.parentId !== null),
  };
}

export async function getBrandOptions() {
  return db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .orderBy(asc(brands.id));
}

export { childCategory, parentCategory };
