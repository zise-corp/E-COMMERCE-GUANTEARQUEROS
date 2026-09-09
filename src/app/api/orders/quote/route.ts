import { NextResponse } from "next/server";
import { calculateOrderPricing, OrderError, priceLines } from "@/db/queries/orders";
import { issueQuote } from "@/lib/checkout-quote";
import { quoteOrderSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = quoteOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  try {
    const lines = await priceLines(parsed.data.items);
    const pricing = await calculateOrderPricing(lines, parsed.data.discountCode, parsed.data.shipping);
    const token = await issueQuote(parsed.data, lines, pricing);
    return NextResponse.json({ ok: true, quote: { lines, pricing, token } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof OrderError ? error.message : "No pudimos verificar el pedido. Intenta de nuevo." }, { status: error instanceof OrderError ? 409 : 503 });
  }
}
