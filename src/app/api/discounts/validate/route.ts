import { NextResponse } from "next/server";
import { calculateOrderPricing, priceLines } from "@/db/queries/orders";
import { orderItemSchema } from "@/lib/validators";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  items: z.array(orderItemSchema).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Revisa el código." }, { status: 400 });
    const lines = await priceLines(parsed.data.items);
    const pricing = await calculateOrderPricing(lines, parsed.data.code);
    if (!pricing.discountCode) {
      return NextResponse.json({ ok: false, error: "El código no existe o no está activo." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, code: pricing.discountCode, discount: pricing.discount });
  } catch {
    return NextResponse.json({ ok: false, error: "No pudimos validar el código." }, { status: 500 });
  }
}
