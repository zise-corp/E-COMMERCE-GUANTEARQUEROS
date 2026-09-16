import { AdminTopbar } from "@/components/admin/AdminShell";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Seguridad" };

export default async function SecurityPage() {
  await requireAdmin();
  return (
    <>
      <AdminTopbar title="Seguridad" subtitle="Contraseña y sesiones administrativas" />
      <div className="px-5 py-7 sm:px-7">
        <ChangePasswordForm />
      </div>
    </>
  );
}
