import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { orders } from "@/db/schema";
import { decrementStockFor, getOrder, markPayment } from "@/db/queries/orders";
import { notifyPaymentConfirmed } from "@/lib/notify";
import { isSandbox, mapStatus, verifyWebhookSignature } from "@/lib/yopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de YoPago: la fuente de verdad del pago. El polling del paso 2 solo lee
 * lo que esto ya escribió.
 *
 * Es idempotente: si llega dos veces el mismo "pagado", el stock se descuenta una
 * sola vez.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const signature =
    request.headers.get("x-yopago-signature") ??
    request.headers.get("x-signature") ??
    null;

  if (!(await verifyWebhookSignature(raw, signature))) {
    return NextResponse.json({ ok: false, error: "Firma inválida." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 });
  }

  const reference = payload["reference"] ?? payload["order_number"] ?? payload["orderNumber"];
  const rawStatus = payload["status"] ?? payload["state"] ?? "";
  const txId = payload["transaction_id"] ?? payload["id"] ?? null;

  const orderNumber = Number.parseInt(String(reference ?? ""), 10);
  if (!Number.isFinite(orderNumber)) {
    return NextResponse.json({ ok: false, error: "Falta la referencia del pedido." }, { status: 400 });
  }

  const [row] = await db
    .select({ id: orders.id, paymentStatus: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.number, orderNumber))
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }

  const status = mapStatus(String(rawStatus));
  const alreadyPaid = row.paymentStatus === "pagado";

  await markPayment(row.id, status, txId ? String(txId) : undefined);

  if (status === "pagado" && !alreadyPaid) {
    await decrementStockFor(row.id);
    const order = await getOrder(row.id);
    if (order) {
      void notifyPaymentConfirmed({
        id: order.id,
        number: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        mode: order.mode,
        department: order.department,
        paymentStatus: "pagado",
      }).catch(() => undefined);
    }
  }

  return NextResponse.json({ ok: true, sandbox: isSandbox() });
}
