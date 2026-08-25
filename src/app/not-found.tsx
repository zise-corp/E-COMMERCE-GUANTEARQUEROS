import { Escudo } from "@/components/brand/Escudo";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <Escudo width={64} height={75} className="opacity-70" />

      <p className="mt-8 font-display text-[clamp(4rem,14vw,8rem)] uppercase leading-none text-brand skew-fast">
        404
      </p>

      <h1 className="mt-2 font-display text-[clamp(1.75rem,5vw,2.5rem)] uppercase leading-none skew-fast">
        Acá no hay nada
      </h1>

      <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-content-muted">
        La página que buscás se movió o nunca existió. Vuelve a la tienda y sigue desde ahí.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          Volver a la tienda
        </ButtonLink>
        <ButtonLink href="/guantes" variant="outline" size="lg">
          Ver guantes
        </ButtonLink>
      </div>
    </main>
  );
}
