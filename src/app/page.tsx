import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";

// Placeholder temporal: se reemplaza por la home real en el bloque 4.
export default function Page() {
  return (
    <main className="container-shop py-16">
      <div className="flex items-center gap-3">
        <Escudo width={34} height={40} />
        <Wordmark size={22} />
      </div>
      <div className="mt-10 flex items-end gap-10">
        {[24, 34, 64, 160].map((w) => (
          <div key={w} className="text-center">
            <Escudo width={w} height={Math.round((w * 40) / 34)} />
            <div className="mt-3 text-[11px] text-content-dim">{w}px</div>
          </div>
        ))}
      </div>
    </main>
  );
}
