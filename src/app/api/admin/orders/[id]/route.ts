import { NextResponse } from "next/server";
import { getOrder } from "@/db/queries/orders";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Detalle completo del pedido para el drawer del panel. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = Number.parseInt(id, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ ok: false, error: "Id inválido." }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}
