import { AdminTopbar } from "@/components/admin/AdminShell";
import { ContactSettingsForm } from "@/components/admin/ContactSettingsForm";
import { CheckoutSettingsForm } from "@/components/admin/CheckoutSettingsForm";
import { getCheckoutSettings, getContactSettings } from "@/db/queries/settings";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, contact] = await Promise.all([getCheckoutSettings(), getContactSettings()]);
  return (
    <>
      <AdminTopbar title="Configuración" subtitle="Contacto, envíos y descuentos" />
      <div className="max-w-4xl space-y-7 px-5 py-7 sm:px-7">
        <ContactSettingsForm initial={contact} />
        <CheckoutSettingsForm initial={settings} />
      </div>
    </>
  );
}
