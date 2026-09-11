import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrderByPublicId, OrderError } from "@/db/queries/orders";
import { abandonYoPagoPayment } from "@/db/queries/payments";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";

export const runtime = "nodejs";
const bodySchema = z.object({ orderId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const order = await getOrderByPublicId(parsed.data.orderId);
  const session = await verifyToken((await cookies()).get(ORDER_COOKIE)?.value, "order");
  if (!order || !session?.orderIds.includes(order.id)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  try {
    await abandonYoPagoPayment(order.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof OrderError ? error.message : "No pudimos cerrar el proceso de pago." }, { status: error instanceof OrderError ? 409 : 500 });
  }
}
