import { AdminTopbar } from "@/components/admin/AdminShell";
import { CheckoutSettingsForm } from "@/components/admin/CheckoutSettingsForm";
import { getCheckoutSettings } from "@/db/queries/settings";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Envíos y descuentos" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getCheckoutSettings();
  return (
    <>
      <AdminTopbar title="Envíos y descuentos" subtitle="Configuración del checkout" />
      <div className="max-w-4xl px-5 py-7 sm:px-7">
        <CheckoutSettingsForm initial={settings} />
      </div>
    </>
  );
}
