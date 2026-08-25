"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Escudo } from "@/components/brand/Escudo";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Resumen", badge: null },
  { href: "/admin/categorias", label: "Categorías", badge: "categories" },
  { href: "/admin/productos", label: "Productos", badge: "products" },
  { href: "/admin/pedidos", label: "Pedidos", badge: "newOrders" },
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
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh bg-[#0F0F0E] text-[#E9E7E4] lg:grid lg:grid-cols-[234px_1fr]">
      <aside className="flex flex-col border-b border-ink-700 bg-[#0B0B0A] lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-1.5 border-b border-ink-700 px-[18px] py-5">
          <Escudo width={24} height={29} />
          <div>
            <p className="font-display text-sm tracking-[0.02em] skew-fast-8">
              <span className="text-brand">UANTE</span>
              <span className="text-content">ARQUEROS</span>
            </p>
            <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.22em] text-content-dim">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex flex-1 gap-1.5 overflow-x-auto p-2.5 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-[10px_10px]">
          {NAV.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const badge = item.badge ? counts[item.badge] : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 whitespace-nowrap border-l-2 px-3 py-[11px] text-[13.5px] font-bold transition-colors duration-150",
                  active
                    ? "border-brand bg-[#171716] text-content"
                    : "border-transparent text-[#8A8783] hover:bg-[#171716]",
                )}
              >
                <span>{item.label}</span>
                {badge ? (
                  <span className="text-[11px] text-content-dim tabular">
                    {item.badge === "newOrders" ? `${badge} nuevos` : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-ink-700 p-3.5 lg:block">
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

      <div className="min-w-0">{children}</div>
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
    <div className="sticky top-0 z-20 flex min-h-[62px] flex-wrap items-center justify-between gap-3 border-b border-ink-700 bg-[#0F0F0E]/[0.94] px-5 py-3 backdrop-blur-[8px] sm:px-7">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h1 className="font-display text-xl uppercase skew-fast-6">{title}</h1>
        {subtitle ? <p className="text-[11.5px] text-content-dim">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2.5">{action}</div> : null}
    </div>
  );
}
