import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Resultado del pago", robots: { index: false, follow: false } };

export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  // YoPago vuelve aquí con ?pedido=<id>: URL corta, ver buildYoPagoPayload.
  const { pedido } = await searchParams;
  const order = pedido && /^\d{1,9}$/.test(pedido) ? await getOrder(Number(pedido)) : null;
  const session = await verifyToken((await cookies()).get(ORDER_COOKIE)?.value, "order");
  const authorized = order && session?.orderIds.includes(order.id);
  const paid = authorized && (order.financialStatus === "paid" || order.financialStatus === "paid_inventory_review");
  return (
    <section className="container-shop flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
      <p className="label-xs text-brand">YoPago</p>
      <h1 className="mt-3 font-display text-4xl uppercase skew-fast-6">{paid ? "Pago confirmado" : "Estamos verificando tu pago"}</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-content-muted">
        {paid ? "La confirmación llegó directamente desde la pasarela." : "El regreso desde YoPago no confirma el cobro por sí solo. Revisa el estado desde tu pedido mientras esperamos la confirmación segura."}
      </p>
      <Link href={authorized ? `/checkout/pago?pedido=${order.id}` : "/checkout/envio"} className="mt-7 bg-brand px-6 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-ink-950">
        {paid ? "Ver confirmación" : "Consultar estado"}
      </Link>
    </section>
  );
}
