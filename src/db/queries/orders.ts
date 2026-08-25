import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { orderItems, orders, productImages, products } from "../schema";
import type { ShippingOutput } from "@/lib/validators";
import { toDbNumeric } from "@/lib/money";
import { LOCAL_DEPARTMENT } from "@/lib/site";

export type OrderLineInput = { productId: number; size: string | null; quantity: number };

export type PricedLine = {
  productId: number;
  name: string;
  size: string | null;
  unitPrice: string;
  quantity: number;
  imagePublicId: string | null;
  attributesSnapshot: { name: string; value: string }[];
};

export class OrderError extends Error {}

/**
 * Los precios los pone el server. El cliente manda qué compra y cuánto, nunca a
 * qué precio; acá se leen de la base y quedan congelados en `order_items`.
 */
export async function priceLines(lines: OrderLineInput[]): Promise<PricedLine[]> {
  const ids = [...new Set(lines.map((l) => l.productId))];
  if (ids.length === 0) throw new OrderError("El carrito está vacío.");

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stock: products.stock,
      sizes: products.sizes,
      attributes: products.attributes,
      published: products.published,
      image: sql<string | null>`(
        SELECT pi.public_id FROM ${productImages} pi
        WHERE pi.product_id = ${products.id}
        ORDER BY pi.is_primary DESC, pi.position ASC, pi.id ASC
        LIMIT 1
      )`,
    })
    .from(products)
    .where(inArray(products.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));

  return lines.map((line) => {
    const p = byId.get(line.productId);
    if (!p || !p.published) {
      throw new OrderError("Uno de los productos ya no está disponible. Revisa tu carrito.");
    }
    if (p.stock < line.quantity) {
      throw new OrderError(
        p.stock === 0
          ? `“${p.name}” se quedó sin stock.`
          : `De “${p.name}” quedan ${p.stock} unidades.`,
      );
    }
    const sizes = p.sizes ?? [];
    if (sizes.length > 0 && (line.size === null || !sizes.includes(line.size))) {
      throw new OrderError(`Elige una talla válida para “${p.name}”.`);
    }
    return {
      productId: p.id,
      name: p.name,
      size: line.size,
      unitPrice: p.price,
      quantity: line.quantity,
      imagePublicId: p.image,
      attributesSnapshot: p.attributes ?? [],
    };
  });
}

export function totalOf(lines: PricedLine[]): string {
  const cents = lines.reduce(
    (acc, l) => acc + Math.round(Number.parseFloat(l.unitPrice) * 100) * l.quantity,
    0,
  );
  return (cents / 100).toFixed(2);
}

/** Solo se guardan los campos que corresponden a la modalidad elegida. */
function deliveryColumns(shipping: ShippingOutput) {
  if (shipping.mode === "pickup") {
    return {
      mode: "pickup" as const,
      department: null,
      address: null,
      lat: null,
      lng: null,
      mapsUrl: null,
      documentId: null,
      branch: null,
      email: null,
    };
  }
  const local = shipping.department === LOCAL_DEPARTMENT;
  return {
    mode: "delivery" as const,
    department: shipping.department,
    address: local ? shipping.address : null,
    lat: local && shipping.lat !== null ? shipping.lat.toFixed(6) : null,
    lng: local && shipping.lng !== null ? shipping.lng.toFixed(6) : null,
    mapsUrl: local && shipping.mapsUrl ? shipping.mapsUrl : null,
    documentId: local ? null : shipping.documentId,
    branch: local ? null : shipping.branch,
    email: local ? null : shipping.email,
  };
}

export async function createOrder(shipping: ShippingOutput, lines: PricedLine[]) {
  const total = totalOf(lines);

  return db.transaction(async (tx) => {
    const [seq] = await tx.execute<{ number: number }>(
      sql`SELECT nextval('orders_number_seq')::int AS number`,
    );
    const number = seq?.number;
    if (!number) throw new OrderError("No pudimos generar el número de pedido.");

    const [order] = await tx
      .insert(orders)
      .values({
        number,
        customerName: shipping.name,
        customerPhone: shipping.phone,
        note: shipping.note || null,
        ...deliveryColumns(shipping),
        total: toDbNumeric(total),
      })
      .returning({ id: orders.id, number: orders.number });

    if (!order) throw new OrderError("No pudimos crear el pedido.");

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        name: l.name,
        size: l.size,
        unitPrice: toDbNumeric(l.unitPrice),
        quantity: l.quantity,
        imagePublicId: l.imagePublicId,
        attributesSnapshot: l.attributesSnapshot,
      })),
    );

    return order;
  });
}

/**
 * Reenvío del paso 1 en la misma sesión: se actualiza la orden existente.
 * Si ya está pagada o cancelada no se toca.
 */
export async function updateOrder(
  orderId: number,
  shipping: ShippingOutput,
  lines: PricedLine[],
) {
  const total = totalOf(lines);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!current) throw new OrderError("El pedido ya no existe.");
    if (current.paymentStatus === "pagado") {
      throw new OrderError("Este pedido ya está pagado y no se puede modificar.");
    }
    if (current.status === "cancelado") {
      throw new OrderError("Este pedido fue cancelado.");
    }

    await tx
      .update(orders)
      .set({
        customerName: shipping.name,
        customerPhone: shipping.phone,
        note: shipping.note || null,
        ...deliveryColumns(shipping),
        total: toDbNumeric(total),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId,
        productId: l.productId,
        name: l.name,
        size: l.size,
        unitPrice: toDbNumeric(l.unitPrice),
        quantity: l.quantity,
        imagePublicId: l.imagePublicId,
        attributesSnapshot: l.attributesSnapshot,
      })),
    );

    return { id: current.id, number: current.number };
  });
}

export type OrderSummary = {
  id: number;
  number: number;
  customerName: string;
  customerPhone: string;
  note: string | null;
  mode: "pickup" | "delivery";
  department: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  mapsUrl: string | null;
  documentId: string | null;
  branch: string | null;
  email: string | null;
  status: "recibido" | "en_proceso" | "completado" | "cancelado";
  paymentStatus: "pendiente" | "pagado" | "fallido" | "reembolsado";
  paymentMethod: string | null;
  paymentRef: string | null;
  total: string;
  createdAt: Date;
  items: {
    name: string;
    size: string | null;
    unitPrice: string;
    quantity: number;
    imagePublicId: string | null;
    attributesSnapshot: { name: string; value: string }[];
  }[];
};

export async function getOrder(orderId: number): Promise<OrderSummary | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db
    .select({
      name: orderItems.name,
      size: orderItems.size,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      imagePublicId: orderItems.imagePublicId,
      attributesSnapshot: orderItems.attributesSnapshot,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.id);

  return { ...order, items } as OrderSummary;
}

/* ── Consultas del admin ──────────────────────────────────────────────────── */

export async function listOrders(status?: OrderSummary["status"]) {
  const where = status ? eq(orders.status, status) : undefined;
  return db
    .select({
      id: orders.id,
      number: orders.number,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      mode: orders.mode,
      department: orders.department,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.number));
}

export async function setOrderStatus(orderId: number, status: OrderSummary["status"]) {
  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

export async function markPayment(
  orderId: number,
  paymentStatus: OrderSummary["paymentStatus"],
  paymentRef?: string,
  paymentMethod?: string,
) {
  await db
    .update(orders)
    .set({
      paymentStatus,
      ...(paymentRef ? { paymentRef } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

/** Descuenta stock cuando el pago se confirma, no antes. */
export async function decrementStockFor(orderId: number) {
  const lines = await db
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const line of lines) {
    if (line.productId === null) continue;
    await db
      .update(products)
      .set({ stock: sql`GREATEST(0, ${products.stock} - ${line.quantity})`, updatedAt: new Date() })
      .where(eq(products.id, line.productId));
  }
}

export async function countOrdersSince(since: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(gte(orders.createdAt, since));
  return row?.n ?? 0;
}

export async function ordersByStatus() {
  return db
    .select({ status: orders.status, n: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status);
}

export async function paidTotalSince(since: Date) {
  const [row] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)::text` })
    .from(orders)
    .where(and(gte(orders.createdAt, since), eq(orders.paymentStatus, "pagado")));
  return row?.total ?? "0";
}
