import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelSandboxPayment } from "@/db/queries/payments";
import { OrderError } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { isSandbox } from "@/lib/yopago";

export const runtime = "nodejs";
const schema = z.object({ orderId: z.number().int().positive() });

export async function POST(request: Request) {
  if (!isSandbox()) return NextResponse.json({ ok: false, error: "No disponible." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const store = await cookies();
  const session = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  if (!session?.orderIds.includes(parsed.data.orderId)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  try {
    await cancelSandboxPayment(parsed.data.orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof OrderError ? error.message : "No pudimos cancelar el intento." }, { status: error instanceof OrderError ? 409 : 503 });
  }
}
