import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PaymentClient } from "@/components/shop/PaymentClient";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { isSandbox } from "@/lib/yopago";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const store = await cookies();
  const session = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  const { pedido } = await searchParams;
  const orderId = pedido && /^\d+$/.test(pedido) ? Number(pedido) : null;
  if (!orderId || !Number.isSafeInteger(orderId) || !session?.orderIds.includes(orderId)) redirect("/checkout/envio");

  const order = await getOrder(orderId);
  if (!order) redirect("/");

  // Un pedido ya pagado no vuelve al paso 2.
  if (order.paymentStatus === "pagado") redirect(`/checkout/confirmacion?pedido=${order.id}`);
  if (order.status === "cancelado" || order.paymentStatus === "reembolsado") redirect("/checkout/envio");

  return (
    <PaymentClient
      order={{
        id: order.id,
        number: order.number,
        total: order.total,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal === null ? null : Number(order.subtotal),
        shipping: order.shippingAmount === null ? null : Number(order.shippingAmount),
        discount: order.discountAmount === null ? null : Number(order.discountAmount),
        pickup: order.mode === "pickup",
        items: order.items.map((i) => ({
          name: i.name,
          size: i.size,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          imagePublicId: i.imagePublicId,
          personalization: i.attributesSnapshot.find((attribute) => attribute.name === "Personalización")?.value ?? null,
        })),
      }}
      sandbox={isSandbox()}
    />
  );
}
