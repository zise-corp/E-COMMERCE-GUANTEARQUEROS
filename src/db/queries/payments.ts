import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db } from "../index";
import { orderItems, orders, products } from "../schema";
import { OrderError } from "./orders";

export type PaymentMethod = "qr" | "card";

/** Solo para el simulador. Un proveedor real necesita su propio registro de intentos. */
export async function startSandboxPayment(orderId: number, method: PaymentMethod) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw new OrderError("El pedido no existe.");
    if (order.status !== "recibido" || order.paymentStatus === "pagado" || order.paymentStatus === "reembolsado") {
      throw new OrderError("Este pedido ya no admite un pago.");
    }
    // Recargar no crea otro intento. Cambiar de método invalida el anterior
    // únicamente en sandbox: aquí no existe un cobro externo.
    const txId = order.paymentStatus === "pendiente" && order.paymentMethod === method && order.paymentRef?.startsWith("SBX-")
      ? order.paymentRef : `SBX-${randomUUID()}`;
    await tx.update(orders).set({ paymentRef: txId, paymentMethod: method, paymentStatus: "pendiente", updatedAt: new Date() }).where(eq(orders.id, orderId));
    return { txId, method, amount: order.total, qrImage: null, checkoutUrl: null, sandbox: true };
  });
}

export async function cancelSandboxPayment(orderId: number) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw new OrderError("El pedido no existe.");
    if (order.paymentStatus === "pagado" || order.paymentStatus === "reembolsado") throw new OrderError("El pedido ya fue pagado. No se puede volver a editar.");
    if (order.paymentRef && !order.paymentRef.startsWith("SBX-")) throw new OrderError("El intento requiere confirmación de la pasarela antes de cancelarlo.");
    await tx.update(orders).set({ paymentRef: null, paymentMethod: null, paymentStatus: "pendiente", updatedAt: new Date() }).where(eq(orders.id, orderId));
  });
}

export type VerifiedPaymentResult = {
  orderId: number;
  transactionId: string;
  amount: string;
  currency: string;
  status: "pagado" | "fallido";
};

/**
 * Solo recibe resultados autenticados por un adaptador. Pago y stock se guardan
 * juntos. Reservas y conciliación de cobros externos quedan para la integración.
 */
export async function applyPaymentResult(event: VerifiedPaymentResult): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, event.orderId)).for("update");
    if (!order) throw new OrderError("El pedido no existe.");
    if (!event.transactionId || order.paymentRef !== event.transactionId) throw new OrderError("El intento de pago ya no está vigente.");
    if (!/^\d+(\.\d{1,2})?$/.test(event.amount) || Number(event.amount) !== Number(order.total) || event.currency !== order.currency) {
      throw new OrderError("El importe o la moneda del pago no coinciden con el pedido.");
    }
    if (order.paymentStatus === "pagado" || order.paymentStatus === "reembolsado") return false;
    if (order.status !== "recibido") throw new OrderError("El pedido no admite confirmación de pago.");
    if (order.paymentStatus === "fallido") return false;

    if (event.status === "pagado") {
      const lines = await tx.select({ productId: orderItems.productId, quantity: sql<number>`sum(${orderItems.quantity})::int` })
        .from(orderItems).where(eq(orderItems.orderId, order.id)).groupBy(orderItems.productId).orderBy(asc(orderItems.productId));
      if (!lines.length) throw new OrderError("El pedido no tiene productos.");
      for (const line of lines) {
        if (line.productId === null) throw new OrderError("Un producto ya no está disponible.");
        const updated = await tx.update(products).set({ stock: sql`${products.stock} - ${line.quantity}`, updatedAt: new Date() })
          .where(and(eq(products.id, line.productId), gte(products.stock, line.quantity))).returning({ id: products.id });
        if (!updated.length) throw new OrderError("No hay stock suficiente. Vuelve a revisar el pedido.");
      }
    }
    await tx.update(orders).set({ paymentStatus: event.status, updatedAt: new Date() }).where(eq(orders.id, order.id));
    return true;
  });
}
