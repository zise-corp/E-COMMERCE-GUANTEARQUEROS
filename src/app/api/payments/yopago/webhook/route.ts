import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Se habilitará cuando estén definidos firma, eventos e importes de YoPago. */
export async function POST() {
  return NextResponse.json({ ok: false, error: "La integración de pagos todavía no está habilitada." }, { status: 503 });
}
