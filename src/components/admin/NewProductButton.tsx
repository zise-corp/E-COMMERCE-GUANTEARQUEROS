export function NewProductButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap bg-brand px-4 py-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot"
    >
      + Nuevo producto
    </button>
  );
}
