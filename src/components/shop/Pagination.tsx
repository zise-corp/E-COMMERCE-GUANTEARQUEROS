import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (number) => number === 1 || number === pageCount || Math.abs(number - page) <= 2,
  );
  return (
    <nav aria-label="Paginación de productos" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <PageLink page={page - 1} disabled={page === 1}>Anterior</PageLink>
      {pages.map((number, index) => {
        const previous = pages[index - 1];
        return (
          <span key={number} className="contents">
            {previous !== undefined && number - previous > 1 ? <span className="px-1 text-content-faint">…</span> : null}
            <PageLink page={number} active={number === page}>{number}</PageLink>
          </span>
        );
      })}
      <PageLink page={page + 1} disabled={page === pageCount}>Siguiente</PageLink>
    </nav>
  );
}

function PageLink({ page, active = false, disabled = false, children }: { page: number; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  const classes = cn("flex min-h-10 min-w-10 items-center justify-center border px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors", active ? "border-brand bg-brand text-ink-950" : "border-line-strong text-content-muted hover:border-brand hover:text-brand", disabled && "pointer-events-none opacity-35");
  return disabled ? <span aria-disabled="true" className={classes}>{children}</span> : <Link href={`/?pagina=${page}#productos`} scroll className={classes} aria-current={active ? "page" : undefined}>{children}</Link>;
}
