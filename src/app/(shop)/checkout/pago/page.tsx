import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PaymentClient } from "@/components/shop/PaymentClient";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken, type OrderSession } from "@/lib/session";
import { isSandbox } from "@/lib/yopago";
import { getCheckoutSettings } from "@/db/queries/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false, follow: false },
};

export default async function PaymentPage() {
  const store = await cookies();
  const session = await verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
  const orderId = session?.orderIds.at(-1);
  if (!orderId) redirect("/");

  const order = await getOrder(orderId);
  if (!order) redirect("/");

  // Un pedido ya pagado no vuelve al paso 2.
  if (order.paymentStatus === "pagado") redirect("/checkout/confirmacion");

  const settings = await getCheckoutSettings();
  const subtotal = order.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  const shipping = order.mode === "pickup"
    ? 0
    : order.department === "La Paz"
      ? settings.localDeliveryPrice
      : settings.transportPrice;
  const discount = Math.max(0, subtotal + shipping - Number(order.total));

  return (
    <PaymentClient
      order={{
        id: order.id,
        number: order.number,
        total: order.total,
        paymentStatus: order.paymentStatus,
        subtotal,
        shipping,
        discount,
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
