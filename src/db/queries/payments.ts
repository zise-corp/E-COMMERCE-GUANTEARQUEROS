import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { orderItems, orders, paymentAttempts, paymentEvents, products } from "../schema";
import { OrderError } from "./orders";
import { YOPAGO_COMPANY_CODE, generateYoPagoCard, generateYoPagoQr, normalizeYoPagoCurrency, type YoPagoCurrency } from "@/lib/yopago";

export type PaymentMethod = "qr" | "card";
export type LivePaymentIntent = { transactionId: string; method: PaymentMethod; amount: string; qrImage: string | null; checkoutUrl: string | null };

/** Creates or reuses one provider attempt while holding an order-scoped lock. */
export async function startYoPagoPayment(orderId: number, method: PaymentMethod): Promise<LivePaymentIntent> {
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${orderId}, ${method === "qr" ? 1 : 2})`);
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw new OrderError("El pedido no existe.");
    if (["paid", "paid_inventory_review", "abandoned", "expired", "cancelled"].includes(order.financialStatus) || order.status === "cancelado" || order.paymentStatus === "pagado" || order.paymentStatus === "reembolsado") throw new OrderError("Este pedido ya no admite un nuevo pago.");

    const [reusable] = await tx.select().from(paymentAttempts).where(and(
      eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.method, method), eq(paymentAttempts.status, "created"),
    )).orderBy(desc(paymentAttempts.id)).limit(1);
    if (reusable?.transactionId && (method === "qr" ? reusable.qrData : reusable.cardUrl)) {
      // El pedido refleja el pago que el cliente tiene en pantalla, como el sync de Tienda-Virtual.
      await tx.update(orders).set({ paymentMethod: method, transactionId: reusable.transactionId, companyCode: reusable.companyCode, codeTransaction: reusable.transactionCode, updatedAt: new Date() }).where(eq(orders.id, order.id));
      return { intent: { transactionId: reusable.transactionId, method, amount: reusable.amount, qrImage: reusable.qrData, checkoutUrl: reusable.cardUrl } };
    }

    const companyCode = YOPAGO_COMPANY_CODE;
    // Mismo formato que Tienda-Virtual (`${orderId}-${Date.now()}`, ~18
    // caracteres). Único: number no se repite entre pedidos y el FOR UPDATE de
    // arriba serializa los intentos de un mismo pedido.
    const codeTransaction = `${order.number}-${Date.now()}`;
    const currency: YoPagoCurrency = normalizeYoPagoCurrency(order.currency);
    const [attempt] = await tx.insert(paymentAttempts).values({ orderId: order.id, method, companyCode, transactionCode: codeTransaction, amount: order.total, currency }).returning();
    if (!attempt) throw new OrderError("No pudimos registrar el intento de pago.");

    try {
      // La pasarela solo cobra el monto del pedido: ningún dato del cliente
      // (email, CI, NIT) puede impedir que se genere el pago.
      const input = { orderId: order.id, codeTransaction, amount: order.total, currency, concept: `Pago de pedido ${order.number}` };
      const result = method === "qr" ? await generateYoPagoQr(input) : await generateYoPagoCard(input);
      const transactionId = result.transactionId;
      const qrImage = "qrImage" in result ? result.qrImage : null;
      const qrId = "qrId" in result ? result.qrId : null;
      const checkoutUrl = "checkoutUrl" in result ? result.checkoutUrl : null;
      await tx.update(paymentAttempts).set({ transactionId, qrId, qrData: qrImage, cardUrl: checkoutUrl, providerStatus: result.providerStatus, status: "created", updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
      // Queda en el pedido apenas se genera, se pague o no (como en Tienda-Virtual).
      await tx.update(orders).set({ financialStatus: "payment_created", paymentMethod: method, transactionId, companyCode, codeTransaction, updatedAt: new Date() }).where(eq(orders.id, order.id));
      console.info(JSON.stringify({ event: "payment_attempt.created", orderId: order.id, orderPublicId: order.publicId, paymentAttemptId: attempt.id, paymentMethod: method, provider: "yopago", codeTransaction }));
      return { intent: { transactionId, method, amount: order.total, qrImage, checkoutUrl } };
    } catch (error) {
      await tx.update(paymentAttempts).set({
        status: "failed",
        failureCode: error instanceof Error && "code" in error ? String(error.code).slice(0, 100) : "provider_error",
        failureMessage: error instanceof Error ? error.message.slice(0, 500) : "YoPago payment creation failed",
        updatedAt: new Date(),
      }).where(eq(paymentAttempts.id, attempt.id));
      return { error };
    }
  });
  if ("error" in outcome) throw outcome.error;
  return outcome.intent;
}

/** Stops the browser flow without pretending the provider transaction was cancelled. */
export async function abandonYoPagoPayment(orderId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw new OrderError("El pedido no existe.");
    if (order.financialStatus === "paid" || order.financialStatus === "paid_inventory_review" || order.paymentStatus === "pagado") throw new OrderError("El pago ya fue confirmado.");
    const now = new Date();
    await tx.update(paymentAttempts).set({ status: "abandoned", updatedAt: now }).where(and(eq(paymentAttempts.orderId, order.id), inArray(paymentAttempts.status, ["pending", "created"])));
    await tx.update(orders).set({ financialStatus: "abandoned", updatedAt: now }).where(eq(orders.id, order.id));
    console.info(JSON.stringify({ event: "payment_flow.abandoned", orderId: order.id, orderPublicId: order.publicId }));
  });
}

/** El callback de YoPago, con sus mismos nombres de campo. */
export type YoPagoCallback = { transactionId: string; companyCode: string; description?: string | null; dateRequest?: string | null };

type PaymentAttempt = typeof paymentAttempts.$inferSelect;

class InventoryReviewRequired extends Error {
  constructor(readonly attempt: PaymentAttempt, readonly orderId: number) {
    super("Paid payment requires inventory review");
  }
}

/** El pedido muestra los datos de YoPago del intento que efectivamente se pagó. */
function paidAttemptColumns(attempt: PaymentAttempt) {
  return { paymentMethod: attempt.method, transactionId: attempt.transactionId, companyCode: attempt.companyCode, codeTransaction: attempt.transactionCode };
}

/**
 * Registra todo callback autenticado, se encuentre o no el pago al que se
 * refiere, y confirma dinero y stock de forma atómica.
 */
export async function processYoPagoCallback(payload: YoPagoCallback, eventKey: string, payloadHash: string): Promise<"processed" | "duplicate" | "not_found"> {
  const received = {
    eventType: "payment_confirmed", eventKey, payloadHash,
    transactionId: payload.transactionId, companyCode: payload.companyCode,
    description: payload.description ?? null, dateRequest: payload.dateRequest ?? null,
  };
  return db.transaction(async (tx) => {
    let [event] = await tx.insert(paymentEvents).values(received).onConflictDoNothing({ target: paymentEvents.eventKey }).returning({ id: paymentEvents.id });
    if (!event) {
      // Ya había llegado: si se procesó, es un reintento de YoPago; si en su
      // momento no se encontró el pago, se vuelve a evaluar.
      const [previous] = await tx.select({ id: paymentEvents.id, processingStatus: paymentEvents.processingStatus }).from(paymentEvents).where(eq(paymentEvents.eventKey, eventKey)).limit(1).for("update");
      if (!previous || previous.processingStatus !== "failed") return "duplicate";
      await tx.update(paymentEvents).set({ ...received, processingStatus: "received", errorMessage: null, processedAt: null }).where(eq(paymentEvents.id, previous.id));
      event = previous;
    }
    const eventId = event.id;
    const [attempt] = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.transactionId, payload.transactionId), eq(paymentAttempts.companyCode, payload.companyCode))).limit(1).for("update");
    if (!attempt) {
      // Sin throw: el callback queda registrado aunque no corresponda a un pago nuestro.
      await tx.update(paymentEvents).set({ processingStatus: "failed", errorMessage: "Payment attempt not found", processedAt: new Date() }).where(eq(paymentEvents.id, eventId));
      return "not_found";
    }
    await tx.update(paymentEvents).set({ paymentAttemptId: attempt.id }).where(eq(paymentEvents.id, eventId));
    const [order] = await tx.select().from(orders).where(eq(orders.id, attempt.orderId)).for("update");
    if (!order) throw new OrderError("No se encontró el pedido.");
    if (order.financialStatus === "paid" || order.financialStatus === "paid_inventory_review" || order.paymentStatus === "pagado") {
      await tx.update(paymentEvents).set({ processingStatus: "duplicate", processedAt: new Date() }).where(eq(paymentEvents.id, eventId));
      return "duplicate";
    }

    const lines = await tx.select({ productId: orderItems.productId, quantity: sql<number>`sum(${orderItems.quantity})::int` }).from(orderItems).where(eq(orderItems.orderId, order.id)).groupBy(orderItems.productId).orderBy(asc(orderItems.productId));
    const requested = new Map(lines.filter((line) => line.productId !== null).map((line) => [line.productId!, line.quantity]));
    const inventoryRows = requested.size
      ? await tx.select({ id: products.id, stock: products.stock }).from(products).where(inArray(products.id, [...requested.keys()])).orderBy(asc(products.id)).for("update")
      : [];
    let inventoryComplete = lines.length > 0 && requested.size === lines.length && inventoryRows.length === requested.size
      && inventoryRows.every((row) => row.stock >= (requested.get(row.id) ?? Number.MAX_SAFE_INTEGER));
    if (inventoryComplete) {
      for (const row of inventoryRows) {
        const quantity = requested.get(row.id)!;
        const updated = await tx.update(products).set({ stock: sql`${products.stock} - ${quantity}`, updatedAt: new Date() }).where(and(eq(products.id, row.id), gte(products.stock, quantity))).returning({ id: products.id });
        if (!updated.length) throw new OrderError("No se pudo actualizar el inventario de forma segura.");
      }
    }
    if (!inventoryComplete) {
      // Undo any earlier decrements in this transaction before preserving the paid/review state.
      throw new InventoryReviewRequired(attempt, order.id);
    }
    const now = new Date();
    await tx.update(orders).set({ financialStatus: "paid", paymentStatus: "pagado", ...paidAttemptColumns(attempt), paidAt: now, inventoryProcessedAt: now, updatedAt: now }).where(eq(orders.id, order.id));
    await tx.update(paymentAttempts).set({ status: "paid", paidAt: now, updatedAt: now }).where(eq(paymentAttempts.id, attempt.id));
    await tx.update(paymentAttempts).set({ status: "cancelled", updatedAt: now }).where(and(eq(paymentAttempts.orderId, order.id), inArray(paymentAttempts.status, ["pending", "created", "abandoned", "expired"])));
    await tx.update(paymentEvents).set({ processingStatus: "processed", processedAt: now }).where(eq(paymentEvents.id, eventId));
    return "processed";
  }).catch(async (error) => {
    if (!(error instanceof InventoryReviewRequired)) throw error;
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ financialStatus: "paid_inventory_review", paymentStatus: "pagado", ...paidAttemptColumns(error.attempt), paidAt: now, updatedAt: now }).where(eq(orders.id, error.orderId));
      await tx.update(paymentAttempts).set({ status: "paid", paidAt: now, updatedAt: now }).where(eq(paymentAttempts.id, error.attempt.id));
      await tx.insert(paymentEvents).values({ ...received, paymentAttemptId: error.attempt.id, eventType: "inventory_review_required", processingStatus: "processed", errorMessage: "Paid payment requires inventory review", processedAt: now }).onConflictDoUpdate({ target: paymentEvents.eventKey, set: { paymentAttemptId: error.attempt.id, processingStatus: "processed", errorMessage: "Paid payment requires inventory review", processedAt: now } });
    });
    return "processed" as const;
  });
}
