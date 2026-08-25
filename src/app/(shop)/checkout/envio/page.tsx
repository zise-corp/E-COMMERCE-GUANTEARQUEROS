import type { Metadata } from "next";
import { ShippingCheckout } from "@/components/shop/ShippingCheckout";
import { getCheckoutSettings } from "@/db/queries/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Datos de envío",
  robots: { index: false, follow: false },
};

export default async function ShippingPage() {
  const settings = await getCheckoutSettings();
  return <ShippingCheckout shippingPrice={settings.shippingPrice} />;
}
