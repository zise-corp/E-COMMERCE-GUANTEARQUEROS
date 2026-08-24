import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken, type OrderSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estado del pedido para el polling del paso 2 (cada 4s). La fuente de verdad del
 * pago es el webhook de YoPago; acá solo se lee lo que el webhook ya escribió.
 *
 * Solo responde por pedidos de la propia sesión, y devuelve lo mínimo: nada de
 * datos del cliente en una respuesta que se pide cada 4 segundos.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const orderId = Number.parseInt(id, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ ok: false, error: "Pedido inválido." }, { status: 400 });
  }

  const store = await cookies();
  const session = await verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
  if (!session?.orderIds.includes(orderId)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentRef: order.paymentRef,
        total: order.total,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
