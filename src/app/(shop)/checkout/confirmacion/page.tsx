import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConfirmationView } from "@/components/shop/ConfirmationView";
import { getOrder } from "@/db/queries/orders";
import { ORDER_COOKIE, verifyToken } from "@/lib/session";
import { isLocalDepartment, storeLocationFor } from "@/lib/site";

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

  const storeLocation = storeLocationFor(order.department);
  const deliveryMapsUrl = order.mapsUrl
    ?? (order.lat && order.lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.lat},${order.lng}`)}`
      : undefined);
  const delivery = order.mode === "pickup"
    ? {
        kind: "pickup" as const,
        label: "Retiro en tienda",
        message: `Tu pedido está confirmado para retiro en nuestra sucursal de ${storeLocation?.city ?? order.department ?? "la ciudad seleccionada"}:`,
        detail: storeLocation?.address ?? "Te enviaremos la ubicación exacta por WhatsApp.",
        mapsUrl: storeLocation?.mapsUrl,
        mapsLabel: "Ver ubicación de la sucursal",
      }
    : isLocalDepartment(order.department)
      ? {
          kind: "local_delivery" as const,
          label: "Envío a domicilio",
          message: "Tu pedido está confirmado y será enviado a esta dirección:",
          detail: order.address ?? `Dirección registrada en ${order.department ?? "tu ciudad"}`,
          mapsUrl: deliveryMapsUrl,
          mapsLabel: "Ver ubicación de entrega",
        }
      : {
          kind: "national_shipping" as const,
          label: "Envío nacional",
          message: `Tu pedido será despachado por transporte a ${order.department ?? "tu departamento"} dentro de 24 a 48 horas.`,
          detail: "Te contactaremos por WhatsApp para coordinar la empresa y la sucursal de destino.",
        };

  return <ConfirmationView orderId={order.id} number={order.number} delivery={delivery} />;
}
