import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrderByPublicId, OrderError } from "@/db/queries/orders";
import { startYoPagoPayment } from "@/db/queries/payments";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { paymentIntentSchema } from "@/lib/validators";
import { assertYoPagoReady, YoPagoError } from "@/lib/yopago";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = paymentIntentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const store = await cookies();
  const session = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  const order = await getOrderByPublicId(parsed.data.orderId);
  if (!order || !session?.orderIds.includes(order.id)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  try {
    assertYoPagoReady();
    const intent = await startYoPagoPayment(order.id, parsed.data.method);
    return NextResponse.json({ ok: true, intent }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[payments/yopago] Payment creation failed", { orderPublicId: parsed.data.orderId, method: parsed.data.method, error: error instanceof Error ? error.message : "unknown" });
    const publicError = error instanceof OrderError
      ? error.message
      : error instanceof YoPagoError && error.code === "configuration_error"
        ? "La pasarela todavía no está configurada completamente."
        : error instanceof YoPagoError && error.code.startsWith("http_")
          ? `YoPago rechazó la solicitud (${error.code.replace("http_", "HTTP ")}). Intenta nuevamente en unos minutos.`
          : error instanceof YoPagoError && error.code === "timeout"
            ? "YoPago tardó demasiado en responder. Intenta nuevamente."
            : "No pudimos generar el pago. Intenta nuevamente.";
    return NextResponse.json({ ok: false, error: publicError }, { status: error instanceof OrderError ? 409 : 503 });
  }
}
