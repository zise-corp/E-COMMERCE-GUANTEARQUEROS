import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OrderError } from "@/db/queries/orders";
import { startSandboxPayment } from "@/db/queries/payments";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { paymentIntentSchema } from "@/lib/validators";
import { isSandbox } from "@/lib/yopago";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSandbox()) return NextResponse.json({ ok: false, error: "Los pagos en línea aún no están habilitados. Contacta con la tienda." }, { status: 503 });
  const parsed = paymentIntentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const store = await cookies();
  const session = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  if (!session?.orderIds.includes(parsed.data.orderId)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  try {
    const intent = await startSandboxPayment(parsed.data.orderId, parsed.data.method);
    return NextResponse.json({ ok: true, intent }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof OrderError ? error.message : "No pudimos generar el pago." }, { status: error instanceof OrderError ? 409 : 503 });
  }
}
