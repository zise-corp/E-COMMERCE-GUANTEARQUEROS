import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { orderItems, orders, paymentAttempts, paymentEvents, products } from "../schema";
import { OrderError } from "./orders";
import { yoPagoCompanyCode, generateYoPagoCard, generateYoPagoQr, normalizeYoPagoCurrency } from "@/lib/yopago";

export type PaymentMethod = "qr" | "card";
export type LivePaymentIntent = { transactionId: string; method: PaymentMethod; amount: string; qrImage: string | null; checkoutUrl: string | null };

/*
 * Los flujos de pago leen del pedido solo las columnas que necesitan. Un select
 * completo arrastra cada columna del schema: si un dato del cliente (documento,
 * dirección…) queda sin migrar, la consulta falla y bloquea el cobro o su
 * confirmación, aunque la pasarela no use ese dato.
 */
const paymentOrderColumns = {
  id: orders.id,
  publicId: orders.publicId,
  number: orders.number,
  total: orders.total,
  currency: orders.currency,
  status: orders.status,
  paymentStatus: orders.paymentStatus,
  financialStatus: orders.financialStatus,
};

const paidAttemptSelection = {
  id: paymentAttempts.id,
  orderId: paymentAttempts.orderId,
  method: paymentAttempts.method,
  transactionId: paymentAttempts.transactionId,
  companyCode: paymentAttempts.companyCode,
  transactionCode: paymentAttempts.transactionCode,
};

type OrderPaymentState = Pick<typeof orders.$inferSelect, "status" | "paymentStatus" | "financialStatus">;
type PaidAttempt = Pick<typeof paymentAttempts.$inferSelect, "id" | "orderId" | "method" | "transactionId" | "companyCode" | "transactionCode">;

function acceptsNewPayment(order: OrderPaymentState): boolean {
  return !["paid", "paid_inventory_review", "abandoned", "expired", "cancelled"].includes(order.financialStatus)
    && order.status !== "cancelado"
    && order.paymentStatus !== "pagado"
    && order.paymentStatus !== "reembolsado";
}

/** Un intento "pending" más reciente que esto sigue esperando a YoPago (su timeout es de 15 s). */
const IN_FLIGHT_MS = 30_000;

/**
 * Crea o reutiliza un intento de pago en tres pasos. La llamada a YoPago (hasta
 * 15 s) queda fuera de toda transacción: con el pool chico de producción, una
 * transacción abierta durante esa espera retenía conexiones que necesitan el
 * resto de la tienda y las confirmaciones de pago.
 */
export async function startYoPagoPayment(orderId: number, method: PaymentMethod): Promise<LivePaymentIntent> {
  // 1. Reserva: valida el pedido y deja el intento en "pending", o reutiliza uno vigente.
  const reservation = await db.transaction(async (tx) => {
    const [order] = await tx.select(paymentOrderColumns).from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw new OrderError("El pedido no existe.");
    if (!acceptsNewPayment(order)) throw new OrderError("Este pedido ya no admite un nuevo pago.");

    const [latest] = await tx.select({
      ...paidAttemptSelection,
      status: paymentAttempts.status,
      amount: paymentAttempts.amount,
      qrData: paymentAttempts.qrData,
      cardUrl: paymentAttempts.cardUrl,
      createdAt: paymentAttempts.createdAt,
    }).from(paymentAttempts).where(and(
      eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.method, method), inArray(paymentAttempts.status, ["pending", "created"]),
    )).orderBy(desc(paymentAttempts.id)).limit(1);

    if (latest?.status === "created" && latest.transactionId && (method === "qr" ? latest.qrData : latest.cardUrl)) {
      // El pedido refleja el pago que el cliente tiene en pantalla, como el sync de Tienda-Virtual.
      await tx.update(orders).set({ paymentMethod: method, transactionId: latest.transactionId, companyCode: latest.companyCode, codeTransaction: latest.transactionCode, updatedAt: new Date() }).where(eq(orders.id, order.id));
      return { kind: "reused" as const, intent: { transactionId: latest.transactionId, method, amount: latest.amount, qrImage: latest.qrData, checkoutUrl: latest.cardUrl } };
    }
    if (latest?.status === "pending" && Date.now() - latest.createdAt.getTime() < IN_FLIGHT_MS) {
      throw new OrderError("Ya estamos generando este pago. Espera unos segundos e intenta de nuevo.");
    }
    // Un "pending" más viejo quedó huérfano: el proceso se cortó esperando a YoPago.
    await tx.update(paymentAttempts).set({ status: "failed", failureCode: "stale_pending", failureMessage: "Payment generation did not finish", updatedAt: new Date() })
      .where(and(eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.method, method), eq(paymentAttempts.status, "pending")));

    // Mismo formato que Tienda-Virtual (`${orderId}-${Date.now()}`, ~18
    // caracteres). Único: number no se repite entre pedidos y el FOR UPDATE de
    // arriba serializa los intentos de un mismo pedido.
    const codeTransaction = `${order.number}-${Date.now()}`;
    const currency = normalizeYoPagoCurrency(order.currency);
    const [attempt] = await tx.insert(paymentAttempts).values({ orderId: order.id, method, companyCode: yoPagoCompanyCode(), transactionCode: codeTransaction, amount: order.total, currency }).returning({ id: paymentAttempts.id });
    if (!attempt) throw new OrderError("No pudimos registrar el intento de pago.");
    return { kind: "pending" as const, order, attemptId: attempt.id, codeTransaction, currency };
  });
  if (reservation.kind === "reused") return reservation.intent;
  const { order, attemptId, codeTransaction, currency } = reservation;

  // 2. YoPago, sin ninguna conexión de base tomada. Solo viaja el monto.
  let result: Awaited<ReturnType<typeof generateYoPagoQr>> | Awaited<ReturnType<typeof generateYoPagoCard>>;
  try {
    const input = { orderId: order.id, codeTransaction, amount: order.total, currency, concept: `Pago de pedido ${order.number}` };
    result = method === "qr" ? await generateYoPagoQr(input) : await generateYoPagoCard(input);
  } catch (error) {
    await db.update(paymentAttempts).set({
      status: "failed",
      failureCode: error instanceof Error && "code" in error ? String(error.code).slice(0, 100) : "provider_error",
      failureMessage: error instanceof Error ? error.message.slice(0, 500) : "YoPago payment creation failed",
      updatedAt: new Date(),
    }).where(and(eq(paymentAttempts.id, attemptId), eq(paymentAttempts.status, "pending")));
    throw error;
  }

  const transactionId = result.transactionId;
  const providerStatus = result.providerStatus;
  const qrImage = "qrImage" in result ? result.qrImage : null;
  const qrId = "qrId" in result ? result.qrId : null;
  const checkoutUrl = "checkoutUrl" in result ? result.checkoutUrl : null;

  // 3. Registro: el intento guarda siempre lo que respondió YoPago; el pedido
  // solo se actualiza si nadie lo abandonó, pagó o canceló mientras se esperaba.
  const saved = await db.transaction(async (tx) => {
    const [current] = await tx.select({ status: orders.status, paymentStatus: orders.paymentStatus, financialStatus: orders.financialStatus }).from(orders).where(eq(orders.id, order.id)).for("update");
    const [attempt] = await tx.select({ status: paymentAttempts.status }).from(paymentAttempts).where(eq(paymentAttempts.id, attemptId)).for("update");
    const stillPending = attempt?.status === "pending";
    await tx.update(paymentAttempts).set({
      transactionId, qrId, qrData: qrImage, cardUrl: checkoutUrl, providerStatus,
      ...(stillPending ? { status: "created" as const } : {}),
      updatedAt: new Date(),
    }).where(eq(paymentAttempts.id, attemptId));
    if (!stillPending || !current || !acceptsNewPayment(current)) return false;
    // Queda en el pedido apenas se genera, se pague o no (como en Tienda-Virtual).
    await tx.update(orders).set({ financialStatus: "payment_created", paymentMethod: method, transactionId, companyCode: yoPagoCompanyCode(), codeTransaction, updatedAt: new Date() }).where(eq(orders.id, order.id));
    return true;
  });
  if (!saved) throw new OrderError("Este pedido ya no admite un nuevo pago.");

  console.info(JSON.stringify({ event: "payment_attempt.created", orderId: order.id, orderPublicId: order.publicId, paymentAttemptId: attemptId, paymentMethod: method, provider: "yopago", codeTransaction }));
  return { transactionId, method, amount: order.total, qrImage, checkoutUrl };
}

/** Stops the browser flow without pretending the provider transaction was cancelled. */
export async function abandonYoPagoPayment(orderId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id, publicId: orders.publicId, paymentStatus: orders.paymentStatus, financialStatus: orders.financialStatus }).from(orders).where(eq(orders.id, orderId)).for("update");
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

class InventoryReviewRequired extends Error {
  constructor(readonly attempt: PaidAttempt, readonly orderId: number) {
    super("Paid payment requires inventory review");
  }
}

/** El pedido muestra los datos de YoPago del intento que efectivamente se pagó. */
function paidAttemptColumns(attempt: PaidAttempt) {
  return { paymentMethod: attempt.method, transactionId: attempt.transactionId, companyCode: attempt.companyCode, codeTransaction: attempt.transactionCode };
}

/**
 * Registra todo callback autenticado, se encuentre o no el pago al que se
 * refiere, y confirma dinero y stock de forma atómica. Solo toca columnas de
 * pago y stock: ningún dato del cliente puede impedir que un cobro se confirme.
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
    const [attempt] = await tx.select(paidAttemptSelection).from(paymentAttempts).where(and(eq(paymentAttempts.transactionId, payload.transactionId), eq(paymentAttempts.companyCode, payload.companyCode))).limit(1).for("update");
    if (!attempt) {
      // Sin throw: el callback queda registrado aunque no corresponda a un pago nuestro.
      await tx.update(paymentEvents).set({ processingStatus: "failed", errorMessage: "Payment attempt not found", processedAt: new Date() }).where(eq(paymentEvents.id, eventId));
      return "not_found";
    }
    await tx.update(paymentEvents).set({ paymentAttemptId: attempt.id }).where(eq(paymentEvents.id, eventId));
    const [order] = await tx.select({ id: orders.id, paymentStatus: orders.paymentStatus, financialStatus: orders.financialStatus }).from(orders).where(eq(orders.id, attempt.orderId)).for("update");
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
