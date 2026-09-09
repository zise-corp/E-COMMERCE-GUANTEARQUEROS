import { createHash } from "node:crypto";
import { quoteOrderSchema } from "./validators";
import { signToken, verifyToken } from "./session";
import type { OrderPricing, PricedLine } from "@/db/queries/orders";

export const checkoutHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function requestHash(input: unknown): string {
  // Orden y defaults definidos por Zod, sin incluir el token ni el id del pedido.
  return checkoutHash(quoteOrderSchema.parse(input));
}

export async function issueQuote(input: unknown, lines: PricedLine[], pricing: OrderPricing) {
  return signToken({ kind: "quote", requestHash: requestHash(input), priceHash: checkoutHash({ lines, pricing }), exp: Date.now() + 10 * 60_000 });
}

export async function readQuote(input: unknown, token: string) {
  const quote = await verifyToken(token, "quote");
  return quote?.requestHash === requestHash(input) ? quote : null;
}
