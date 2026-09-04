"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { logoutAction, logoutToStoreAction } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Resumen", badge: null },
  { href: "/admin/inicio", label: "Inicio", badge: null },
  { href: "/admin/categorias", label: "Categorías", badge: "categories" },
  { href: "/admin/marcas", label: "Marcas", badge: null },
  { href: "/admin/productos", label: "Productos", badge: "products" },
  { href: "/admin/pedidos", label: "Pedidos", badge: "newOrders" },
  { href: "/admin/ajustes", label: "Envíos y descuentos", badge: null },
] as const;

export type AdminCounts = { categories: number; products: number; newOrders: number };

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { username: string; role: string };
  counts: AdminCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [storeChoiceOpen, setStoreChoiceOpen] = useState(false);
  const initials = user.username.slice(0, 2).toUpperCase();

  function requestStoreIntro() {
    window.sessionStorage.setItem("gq:store-intro", "admin");
  }

  return (
    <div className="admin-shell min-h-dvh bg-[#0F0F0E] text-[#E9E7E4] lg:grid lg:grid-cols-[258px_minmax(0,1fr)]">
      <aside className="admin-sidebar flex flex-col border-b border-ink-700 bg-[#0B0B0A] lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        {/* Misma composición oficial que utiliza el header de la tienda. */}
        <div className="border-b border-ink-700 px-[18px] py-[18px]">
          <Link href="/admin" className="group block" aria-label="Guantearqueros, panel">
            <span className="flex items-center gap-0">
              <Escudo
                width={34}
                height={40}
                className="shrink-0 transition-transform duration-150 group-hover:-translate-y-px"
              />
              <Wordmark size={22} className="ml-[2px]" />
            </span>
            <span className="mt-1.5 flex items-center gap-2.5">
              <span className="text-[9px] uppercase tracking-[0.3em] text-content-dim">Panel</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 gap-1.5 overflow-x-auto p-2.5 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3">
          {NAV.map((item, index) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const badge = item.badge ? counts[item.badge] : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "admin-nav-item group flex items-center justify-between gap-3 whitespace-nowrap border-l-2 px-3 py-3 text-[13px] font-bold transition-all duration-200",
                  active
                    ? "border-brand bg-brand/[0.09] text-content"
                    : "border-transparent text-[#8A8783] hover:border-line-strong hover:bg-white/[0.025] hover:text-content",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn("text-[9px] font-extrabold tabular tracking-[0.08em]", active ? "text-brand" : "text-content-faint group-hover:text-brand")}>{String(index + 1).padStart(2, "0")}</span>
                  <span>{item.label}</span>
                </span>
                {badge ? (
                  <span className="text-[11px] text-content-dim tabular">
                    {item.badge === "newOrders" ? `${badge} nuevos` : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setStoreChoiceOpen(true)}
            className="group ml-auto flex items-center gap-2 whitespace-nowrap border border-line-strong px-3 py-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-content-muted transition-all duration-200 hover:border-brand hover:bg-brand/[0.07] hover:text-brand lg:ml-0 lg:mt-2 lg:justify-between"
          >
            <span className="flex items-center gap-3">
              <span className="text-[14px] leading-none text-brand" aria-hidden>↗</span>
              <span>Ir a tienda</span>
            </span>
            <span className="hidden text-[9px] uppercase tracking-[0.14em] text-content-faint group-hover:text-brand lg:inline">Tienda</span>
          </button>
        </nav>

        <div className="admin-profile hidden border-t border-ink-700 p-4 lg:block">
          <div className="flex items-center gap-2.5">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center border border-line-strong bg-ink-700 text-xs font-extrabold text-brand">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold">{user.username}</p>
              <p className="text-[11px] text-content-dim">Rol: {user.role}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-3 w-full border border-line-strong py-2.5 text-[11px] uppercase tracking-[0.12em] text-[#8A8783] transition-colors duration-150 hover:border-brand hover:text-brand"
            >
              Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-content min-w-0">{children}</div>

      <Modal
        open={storeChoiceOpen}
        onClose={() => setStoreChoiceOpen(false)}
        title="Ir a la tienda"
        description="¿Quieres conservar abierta tu sesión de administrador o cerrarla antes de entrar a la tienda?"
        width={500}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { requestStoreIntro(); setStoreChoiceOpen(false); window.location.assign("/?intro=admin"); }}
            className="flex min-h-[92px] flex-col justify-between border border-line-strong p-4 transition-colors hover:border-drei-line hover:bg-drei/[0.08]"
          >
            <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-drei-ink">Mantener sesión</span>
            <span className="mt-3 text-[11.5px] normal-case leading-relaxed text-content-dim">Podrás volver al panel sin iniciar sesión nuevamente.</span>
          </button>
          <form action={logoutToStoreAction} onSubmit={requestStoreIntro}>
            <button type="submit" className="flex min-h-[92px] w-full flex-col justify-between border border-brand bg-brand/[0.07] p-4 text-left transition-colors hover:bg-brand/[0.14]">
              <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-brand">Cerrar sesión</span>
              <span className="mt-3 text-[11.5px] normal-case leading-relaxed text-content-muted">Finaliza el acceso administrativo y abre la tienda.</span>
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

/** Barra superior de cada sección: título, subtítulo y acción principal. */
export function AdminTopbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-topbar sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-[#0F0F0E]/[0.94] px-5 py-3 backdrop-blur-[12px] sm:px-7">
      <div className="flex items-center gap-3">
        <span className="h-8 w-[3px] bg-brand shadow-[0_0_12px_rgba(250,42,0,0.45)]" aria-hidden />
        <div className="flex flex-wrap items-baseline gap-2.5">
        <h1 className="font-display text-[22px] uppercase tracking-[0.025em] skew-fast-6">{title}</h1>
        {subtitle ? <p className="text-[11.5px] text-content-dim">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex min-w-0 w-full flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end [&>*]:max-w-full">{action}</div> : null}
    </div>
  );
}
