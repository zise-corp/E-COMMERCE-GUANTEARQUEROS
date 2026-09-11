import { NextResponse } from "next/server";
import { POST as createPayment } from "@/app/api/payments/yopago/route";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { orderId?: unknown } | null;
  return createPayment(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ orderId: body?.orderId, method: "card" }) })) as Promise<NextResponse>;
}
