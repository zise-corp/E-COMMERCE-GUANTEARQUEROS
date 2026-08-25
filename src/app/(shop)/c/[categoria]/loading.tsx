export default function CategoryLoading() {
  return (
    <section className="container-shop animate-pulse py-8 pb-[72px] sm:py-[34px]" aria-label="Cargando categoría">
      <div className="h-3 w-32 bg-ink-700" />
      <div className="mt-5 flex items-end justify-between border-b border-line pb-[18px]">
        <div className="h-12 w-56 bg-ink-800" />
        <div className="h-3 w-20 bg-ink-800" />
      </div>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[258px_1fr]">
        <div className="h-64 border border-line bg-ink-900" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="aspect-[4/3] border border-line bg-ink-900" />
          ))}
        </div>
      </div>
    </section>
  );
}
