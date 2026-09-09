import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConfirmationView } from "@/components/shop/ConfirmationView";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { LOCAL_DEPARTMENT } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido confirmado",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const store = await cookies();
  const session = await verifyToken(store.get(ORDER_COOKIE)?.value, "order");
  const { pedido } = await searchParams;
  const orderId = pedido && /^\d+$/.test(pedido) ? Number(pedido) : null;
  if (!orderId || !Number.isSafeInteger(orderId) || !session?.orderIds.includes(orderId)) redirect("/");

  const order = await getOrder(orderId);
  if (!order) redirect("/");
  if (order.status === "cancelado" || order.paymentStatus === "reembolsado") redirect("/");
  if (order.paymentStatus !== "pagado") redirect(`/checkout/pago?pedido=${order.id}`);

  const delivery =
    order.mode === "pickup"
      ? "Puedes retirarlo en la sucursal principal de La Paz"
      : order.department === LOCAL_DEPARTMENT
        ? "Te lo llevamos a la dirección que marcaste en La Paz"
        : `Lo despachamos por transporte a ${order.department ?? "tu departamento"}`;

  return <ConfirmationView orderId={order.id} number={order.number} delivery={delivery} />;
}
