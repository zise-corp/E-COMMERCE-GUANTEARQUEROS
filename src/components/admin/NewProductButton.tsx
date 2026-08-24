import Link from "next/link";

export function NewProductButton() {
  return (
    <Link
      href="/admin/productos?nuevo=1"
      className="whitespace-nowrap bg-brand px-4 py-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot"
    >
      + Nuevo producto
    </Link>
  );
}
