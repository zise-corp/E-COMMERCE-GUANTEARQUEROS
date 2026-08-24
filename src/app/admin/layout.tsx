import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminCounts } from "@/db/queries/admin";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Guantearqueros" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  // El login se dibuja solo, sin sidebar. El middleware ya bloqueó el resto.
  if (!session) return <>{children}</>;

  const counts = await getAdminCounts();

  return (
    <AdminShell
      user={{ username: session.username, role: session.role }}
      counts={counts}
    >
      {children}
    </AdminShell>
  );
}
