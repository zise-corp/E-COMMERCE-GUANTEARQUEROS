import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { SuperAdminPasswordForm } from "@/components/admin/SuperAdminPasswordForm";
import { logoutAction } from "@/app/admin/actions";
import { requireSuperAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Soporte ZISE" };

export default async function SuperAdminPage() {
  const session = await requireSuperAdmin();

  return (
    <main
      className="flex min-h-dvh items-center justify-center p-4 text-content sm:p-7"
      style={{ background: "radial-gradient(75% 60% at 50% 0%, #1A1512 0%, #0A0A0A 62%)" }}
    >
      <section className="w-full max-w-[720px] animate-rise">
        <header className="mb-5 flex flex-col gap-4 border-b border-line-soft pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-0">
              <Escudo width={30} height={36} />
              <Wordmark size={18} className="ml-[2px]" />
            </div>
            <p className="mt-6 text-[9px] font-extrabold uppercase tracking-[0.24em] text-brand">Acceso restringido · ZISE</p>
            <h1 className="mt-1 font-display text-[32px] uppercase tracking-[0.02em] skew-fast-6 sm:text-[38px]">Restablecer acceso</h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-content-dim">
              Herramienta exclusiva para cambiar la contraseña del administrador de Guante Arqueros.
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-content-faint">Sesión ZISE</p>
            <p className="mt-1 text-[12px] font-bold text-content-muted">{session.username}</p>
          </div>
        </header>

        <SuperAdminPasswordForm />

        <form action={logoutAction} className="mt-4">
          <button
            type="submit"
            className="w-full border border-line-strong px-5 py-3.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors hover:border-brand hover:text-brand"
          >
            Cerrar sesión de ZISE
          </button>
        </form>
      </section>
    </main>
  );
}
