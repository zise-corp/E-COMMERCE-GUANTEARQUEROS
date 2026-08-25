import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConfirmationView } from "@/components/shop/ConfirmationView";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken, type OrderSession } from "@/lib/session";
import { LOCAL_DEPARTMENT } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage() {
  const store = await cookies();
  const session = await verifyToken<OrderSession>(store.get(ORDER_COOKIE)?.value);
  const orderId = session?.orderIds.at(-1);
  if (!orderId) redirect("/");

  const order = await getOrder(orderId);
  if (!order) redirect("/");

  const delivery =
    order.mode === "pickup"
      ? "Puedes retirarlo en la sucursal principal de La Paz"
      : order.department === LOCAL_DEPARTMENT
        ? "Te lo llevamos a la dirección que marcaste en La Paz"
        : `Lo despachamos por transporte a ${order.department ?? "tu departamento"}`;

  return <ConfirmationView number={order.number} delivery={delivery} />;
}
