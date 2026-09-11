import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOrderByPublicId } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(publicId)) return NextResponse.json({ ok: false, error: "Pedido inválido." }, { status: 400 });
  const order = await getOrderByPublicId(publicId);
  const session = await verifyToken((await cookies()).get(ORDER_COOKIE)?.value, "order");
  if (!order || !session?.orderIds.includes(order.id)) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  return NextResponse.json({ ok: true, status: order.financialStatus }, { headers: { "cache-control": "no-store" } });
}
