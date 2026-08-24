import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { decrementStockFor, getOrder, markPayment } from "@/db/queries/orders";
import { notifyPaymentConfirmed } from "@/lib/notify";
import { ORDER_COOKIE, verifyToken, type OrderSession } from "@/lib/session";
import { isSandbox } from "@/lib/yopago";

export const runtime = "nodejs";

const schema = z.object({
  orderId: z.number().int().positive(),
  result: z.enum(["pagado", "fallido"]).default("pagado"),
});

/**
 * Atajo del modo sandbox: confirma o rechaza el pago sin pasarela, para poder
 * recorrer el checkout entero. Devuelve 404 en modo live, así no queda una puerta
 * abierta en producción ni aunque alguien conozca la ruta.
 */
export async function POST(request: Request) {
  if (!isSandbox()) {
    return NextResponse.json({ ok: false, error: "No disponible." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
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

  const alreadyPaid = order.paymentStatus === "pagado";
  await markPayment(order.id, parsed.data.result);

  if (parsed.data.result === "pagado" && !alreadyPaid) {
    await decrementStockFor(order.id);
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

  return NextResponse.json({ ok: true });
}
