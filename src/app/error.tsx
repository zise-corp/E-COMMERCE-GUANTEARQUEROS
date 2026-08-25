"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] error no controlado", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <span className="block h-3 w-24 bg-stripe-danger" aria-hidden />

      <h1 className="mt-8 font-display text-[clamp(2rem,6vw,3rem)] uppercase leading-none skew-fast">
        Algo se rompió
      </h1>

      <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-content-muted">
        Tuvimos un problema cargando esta página. Prueba de nuevo; si sigue pasando, escríbenos y lo
        revisamos.
      </p>

      {error.digest ? (
        <p className="mt-3 text-xs text-content-faint tabular">Referencia: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-brand px-[30px] py-[17px] text-[13.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors duration-150 clip-slash-lg hover:bg-brand-hot"
        >
          Reintentar
        </button>
        {/* Recarga dura a propósito: si el árbol quedó roto, una navegación
            del router puede volver a caer en el mismo error. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="border border-[#3A3A38] px-[30px] py-[17px] text-[13.5px] font-extrabold uppercase tracking-[0.12em] text-content transition-colors duration-150 hover:border-brand hover:text-brand"
        >
          Volver a la tienda
        </a>
      </div>
    </main>
  );
}
