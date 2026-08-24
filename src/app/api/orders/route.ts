import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OrderError,
  createOrder,
  priceLines,
  updateOrder,
} from "@/db/queries/orders";
import { notifyNewOrder } from "@/lib/notify";
import {
  ORDER_COOKIE,
  ORDER_MAX_AGE_SECONDS,
  cookieOptions,
  signToken,
  verifyToken,
  type OrderSession,
} from "@/lib/session";
import { createOrderSchema, updateOrderSchema } from "@/lib/validators";

export const runtime = "nodejs";

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Cookie httpOnly con los pedidos creados en esta sesión: nadie toca los ajenos. */
async function currentSession(): Promise<OrderSession | null> {
  const store = await cookies();
  return verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
}

async function rememberOrder(orderId: number) {
  const store = await cookies();
  const previous = await verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
  const orderIds = [...new Set([...(previous?.orderIds ?? []), orderId])].slice(-10);
  const token = await signToken({
    orderIds,
    exp: Date.now() + ORDER_MAX_AGE_SECONDS * 1000,
  });
  store.set(ORDER_COOKIE, token, { ...cookieOptions, maxAge: ORDER_MAX_AGE_SECONDS });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo inválido.");
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.");
  }

  try {
    const lines = await priceLines(parsed.data.items);
    const order = await createOrder(parsed.data.shipping, lines);
    await rememberOrder(order.id);

    // Enganche pendiente de implementar: nunca debe tumbar la creación del pedido.
    void notifyNewOrder({
      id: order.id,
      number: order.number,
      customerName: parsed.data.shipping.name,
      customerPhone: parsed.data.shipping.phone,
      total: lines.reduce((n, l) => n + Number.parseFloat(l.unitPrice) * l.quantity, 0).toFixed(2),
      mode: parsed.data.shipping.mode,
      department: parsed.data.shipping.department,
      paymentStatus: "pendiente",
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, orderId: order.id, number: order.number });
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, 409);
    console.error("[api/orders] POST", error);
    return fail("No pudimos guardar el pedido. Probá de nuevo en un momento.", 500);
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo inválido.");
  }

  const parsed = updateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos del formulario.");
  }

  const session = await currentSession();
  if (!session?.orderIds.includes(parsed.data.orderId)) {
    return fail("Ese pedido no pertenece a esta sesión.", 403);
  }

  try {
    const lines = await priceLines(parsed.data.items);
    const order = await updateOrder(parsed.data.orderId, parsed.data.shipping, lines);
    return NextResponse.json({ ok: true, orderId: order.id, number: order.number });
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, 409);
    console.error("[api/orders] PATCH", error);
    return fail("No pudimos actualizar el pedido. Probá de nuevo en un momento.", 500);
  }
}
