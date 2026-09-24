import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminCounts } from "@/db/queries/admin";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Guante Arqueros" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  // El login se dibuja solo, sin sidebar. El middleware ya bloqueó el resto.
  if (!session) return <>{children}</>;

  // El soporte ZISE tiene una única pantalla y nunca recibe el dashboard.
  if (session.role === "superadmin") return <ToastProvider>{children}</ToastProvider>;

  const counts = await getAdminCounts();

  return (
    <ToastProvider>
      <AdminShell user={{ username: session.username, role: session.role }} counts={counts}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
