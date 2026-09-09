import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder, OrderError } from "@/db/queries/orders";
import { applyPaymentResult } from "@/db/queries/payments";
import { notifyPaymentConfirmed } from "@/lib/notify";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { isSandbox } from "@/lib/yopago";

export const runtime = "nodejs";
const schema = z.object({ orderId: z.number().int().positive(), transactionId: z.string().startsWith("SBX-").max(100), result: z.enum(["pagado", "fallido"]) });

export async function POST(request: Request) {
  if (!isSandbox()) return NextResponse.json({ ok: false, error: "No disponible." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const store = await cookies();
  const session = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  if (!session?.orderIds.includes(parsed.data.orderId)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  try {
    const order = await getOrder(parsed.data.orderId);
    if (!order) return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
    const changed = await applyPaymentResult({ orderId: order.id, transactionId: parsed.data.transactionId, amount: order.total, currency: "BOB", status: parsed.data.result });
    if (changed && parsed.data.result === "pagado") {
      revalidatePath("/", "layout");
      void notifyPaymentConfirmed({ ...order, paymentStatus: "pagado" }).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof OrderError ? error.message : "No pudimos confirmar el pago." }, { status: error instanceof OrderError ? 409 : 503 });
  }
}
