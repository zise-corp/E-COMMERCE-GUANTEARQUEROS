import { NextResponse } from "next/server";
import { getAdminProduct } from "@/db/queries/admin";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Carga un producto completo para el formulario del panel. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Id inválido." }, { status: 400 });
  }

  const product = await getAdminProduct(productId);
  if (!product) {
    return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, product });
}
