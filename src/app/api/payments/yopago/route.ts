import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrder, markPayment } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken, type OrderSession } from "@/lib/session";
import { site } from "@/lib/site";
import { paymentIntentSchema } from "@/lib/validators";
import { createPayment } from "@/lib/yopago";

export const runtime = "nodejs";

/** Genera el intento de pago del paso 2. Se dispara solo al elegir método. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = paymentIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const store = await cookies();
  const session = await verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
  if (!session?.orderIds.includes(parsed.data.orderId)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const order = await getOrder(parsed.data.orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }
  if (order.paymentStatus === "pagado") {
    return NextResponse.json({ ok: false, error: "Este pedido ya está pagado." }, { status: 409 });
  }

  try {
    const intent = await createPayment({
      orderId: order.id,
      orderNumber: order.number,
      amount: order.total,
      method: parsed.data.method,
      customerName: order.customerName,
      callbackUrl: `${site.url}/api/payments/yopago/webhook`,
    });

    await markPayment(order.id, "pendiente", intent.txId, intent.method);

    return NextResponse.json({
      ok: true,
      intent: {
        txId: intent.txId,
        method: intent.method,
        amount: intent.amount,
        qrImage: intent.qrImage,
        checkoutUrl: intent.checkoutUrl,
        sandbox: intent.sandbox,
      },
    });
  } catch (error) {
    console.error("[api/payments/yopago] POST", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos generar el pago. Probá con el otro método o escribinos." },
      { status: 502 },
    );
  }
}
