import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PaymentClient } from "@/components/shop/PaymentClient";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken, type OrderSession } from "@/lib/session";
import { LOCAL_DEPARTMENT } from "@/lib/site";
import { isSandbox } from "@/lib/yopago";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false, follow: false },
};

function describeDelivery(order: { mode: string; department: string | null }) {
  if (order.mode === "pickup") return "Retiro en el local · La Paz";
  if (!order.department) return "Envío";
  return order.department === LOCAL_DEPARTMENT
    ? "Entrega local · La Paz"
    : `Envío a ${order.department} por transporte`;
}

export default async function PaymentPage() {
  const store = await cookies();
  const session = await verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
  const orderId = session?.orderIds.at(-1);
  if (!orderId) redirect("/");

  const order = await getOrder(orderId);
  if (!order) redirect("/");

  // Un pedido ya pagado no vuelve al paso 2.
  if (order.paymentStatus === "pagado") redirect("/checkout/confirmacion");

  return (
    <PaymentClient
      order={{
        id: order.id,
        number: order.number,
        total: order.total,
        paymentStatus: order.paymentStatus,
        deliverySummary: describeDelivery(order),
        items: order.items.map((i) => ({
          name: i.name,
          size: i.size,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          imagePublicId: i.imagePublicId,
        })),
      }}
      sandbox={isSandbox()}
    />
  );
}
