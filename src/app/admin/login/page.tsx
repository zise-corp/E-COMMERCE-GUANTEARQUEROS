import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Panel administrativo",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; passwordChanged?: string }>;
}) {
  const session = await getAdminSession();
  if (session) redirect(session.role === "superadmin" ? "/admin/superadmin" : "/admin");
  const { next, passwordChanged } = await searchParams;
  return (
    <LoginForm
      next={next ?? "/admin"}
      passwordChanged={passwordChanged === "1"}
    />
  );
}
