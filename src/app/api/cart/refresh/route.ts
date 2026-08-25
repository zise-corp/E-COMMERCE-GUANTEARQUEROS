import { NextResponse } from "next/server";
import { priceLines } from "@/db/queries/orders";
import { orderItemSchema } from "@/lib/validators";
import { z } from "zod";

const schema = z.object({ items: z.array(orderItemSchema).min(1).max(50) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const lines = await priceLines(parsed.data.items);
    return NextResponse.json({
      ok: true,
      images: lines.map((line) => ({
        productId: line.productId,
        imagePublicId: line.imagePublicId,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 409 });
  }
}
