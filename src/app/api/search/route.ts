import { NextResponse } from "next/server";
import { z } from "zod";
import { searchProducts } from "@/db/queries/catalog";

const querySchema = z.object({
  q: z.string().trim().min(2, "Escribe al menos 2 letras.").max(80),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const results = await searchProducts(parsed.data.q);
  return NextResponse.json(
    {
      results: results.map((p) => ({
        slug: p.slug,
        name: p.name,
        brandName: p.brandName,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        imagePublicId: p.imagePublicId,
        isDrei: p.isDrei,
      })),
    },
    { headers: { "cache-control": "private, max-age=15" } },
  );
}
