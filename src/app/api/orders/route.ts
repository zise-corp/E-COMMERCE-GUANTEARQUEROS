import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OrderError,
  calculateOrderPricing,
  createOrder,
  findCheckoutOrder,
  priceLines,
  updateOrder,
} from "@/db/queries/orders";
import { notifyNewOrder } from "@/lib/notify";
import { checkoutHash, readQuote } from "@/lib/checkout-quote";
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
  return verifyToken(store.get(ORDER_COOKIE)?.value, "order");
}

async function rememberOrder(orderId: number) {
  const store = await cookies();
  const previous = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  const orderIds = [...new Set([...(previous?.orderIds ?? []), orderId])].slice(-10);
  const token = await signToken({
    kind: "order",
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
    return fail(parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.");
  }

  try {
    const quote = await readQuote(parsed.data, parsed.data.quoteToken);
    if (!quote) return fail("La revisión expiró o cambió. Vuelve a revisar el pedido.", 409);
    const existing = await findCheckoutOrder(parsed.data.checkoutKey, quote.requestHash);
    if (existing) {
      await rememberOrder(existing.id);
      return NextResponse.json({ ok: true, orderId: existing.id, number: existing.number });
    }
    const lines = await priceLines(parsed.data.items);
    const pricing = await calculateOrderPricing(
      lines,
      parsed.data.discountCode,
      parsed.data.shipping,
    );
    if (checkoutHash({ lines, pricing }) !== quote.priceHash) return fail("El precio o los datos del pedido cambiaron. Vuelve a revisar antes de confirmar.", 409);
    const order = await createOrder(parsed.data.shipping, lines, pricing, parsed.data.checkoutKey, quote.requestHash);
    await rememberOrder(order.id);

    // Enganche pendiente de implementar: nunca debe tumbar la creación del pedido.
    if (order.created) void notifyNewOrder({
      id: order.id,
      number: order.number,
      customerName: `${parsed.data.shipping.name} ${parsed.data.shipping.lastName}`.trim(),
      customerPhone: parsed.data.shipping.phone,
      total: pricing.total,
      mode: parsed.data.shipping.mode,
      department: parsed.data.shipping.department,
      paymentStatus: "pendiente",
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, orderId: order.id, number: order.number });
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, 409);
    console.error("[api/orders] POST", error);
    return fail("No pudimos guardar el pedido. Prueba de nuevo en un momento.", 500);
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
    return fail(parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.");
  }

  const session = await currentSession();
  if (!session?.orderIds.includes(parsed.data.orderId)) {
    return fail("Ese pedido no pertenece a esta sesión.", 403);
  }

  try {
    const quote = await readQuote(parsed.data, parsed.data.quoteToken);
    if (!quote) return fail("La revisión expiró o cambió. Vuelve a revisar el pedido.", 409);
    const lines = await priceLines(parsed.data.items);
    const pricing = await calculateOrderPricing(
      lines,
      parsed.data.discountCode,
      parsed.data.shipping,
    );
    if (checkoutHash({ lines, pricing }) !== quote.priceHash) return fail("El precio o los datos del pedido cambiaron. Vuelve a revisar antes de confirmar.", 409);
    const order = await updateOrder(parsed.data.orderId, parsed.data.shipping, lines, pricing, quote.requestHash);
    return NextResponse.json({ ok: true, orderId: order.id, number: order.number });
  } catch (error) {
    if (error instanceof OrderError) return fail(error.message, 409);
    console.error("[api/orders] PATCH", error);
    return fail("No pudimos actualizar el pedido. Prueba de nuevo en un momento.", 500);
  }
}
