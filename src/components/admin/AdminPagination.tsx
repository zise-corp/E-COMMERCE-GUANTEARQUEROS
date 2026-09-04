"use client";

import { cn } from "@/lib/cn";

export const ADMIN_PAGE_SIZE = 24;

export function AdminPagination({ page, total, pageSize = ADMIN_PAGE_SIZE, onChange }: { page: number; total: number; pageSize?: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const visible = Array.from({ length: Math.min(5, pages) }, (_, index) => Math.min(Math.max(1, page - 2), Math.max(1, pages - 4)) + index);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 px-4 py-3 sm:px-5" aria-label="Paginación del listado">
      <p className="text-[10.5px] uppercase tracking-[0.1em] text-content-dim tabular">Página {page} de {pages} · {total} registros</p>
      <div className="flex items-center gap-1">
        <PageButton label="Anterior" disabled={page === 1} onClick={() => onChange(page - 1)}>←</PageButton>
        {visible.map((number) => <PageButton key={number} label={`Página ${number}`} active={number === page} onClick={() => onChange(number)}>{number}</PageButton>)}
        <PageButton label="Siguiente" disabled={page === pages} onClick={() => onChange(page + 1)}>→</PageButton>
      </div>
    </nav>
  );
}

function PageButton({ children, label, active, disabled, onClick }: { children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={label} aria-current={active ? "page" : undefined} disabled={disabled} onClick={onClick} className={cn("flex h-8 min-w-8 items-center justify-center border px-2 text-[11px] font-bold tabular transition-colors", active ? "border-brand bg-brand text-ink-950" : "border-line-strong text-content-muted hover:border-brand hover:text-brand", disabled && "pointer-events-none opacity-30")}>{children}</button>;
}
