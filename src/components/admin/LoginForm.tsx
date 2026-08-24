"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { loginAction, type LoginState } from "@/app/admin/login/actions";
import { site } from "@/lib/site";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-6"
      style={{ background: "radial-gradient(80% 60% at 50% 0%, #1A1512 0%, #0A0A0A 60%)" }}
    >
      <form
        action={formAction}
        className="w-full max-w-[400px] border border-line-strong bg-ink-850 p-8 animate-rise"
      >
        <div className="flex items-center gap-3">
          <Escudo width={28} height={33} />
          <Wordmark size={17} />
        </div>

        <h1 className="mt-[22px] font-display text-[30px] uppercase skew-fast-6">
          Panel administrativo
        </h1>
        <p className="mb-[22px] mt-2 text-[13px] leading-relaxed text-[#8A8783]">
          Acceso restringido. Credenciales propias del panel, independientes de las cuentas de
          cliente.
        </p>

        <input type="hidden" name="next" value={next} />

        <div className="flex flex-col gap-3">
          <Input
            name="username"
            label="Usuario"
            autoComplete="username"
            required
            autoFocus
            className="bg-[#0E0E0D]"
          />
          <Input
            name="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            required
            className="bg-[#0E0E0D]"
          />

          {state.error ? (
            <p
              role="alert"
              className="border-l-[3px] border-alert bg-alert/10 px-3.5 py-2.5 text-[12.5px] text-alert-soft"
            >
              {state.error}
            </p>
          ) : null}

          <SubmitButton />
        </div>

        <p className="mt-4 text-[11.5px] tracking-[0.06em] text-content-dim">
          {site.url.replace(/^https?:\/\//, "")}/admin
        </p>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2.5 bg-brand px-4 py-[15px] text-[13px] font-extrabold uppercase tracking-[0.14em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:bg-ink-700 disabled:text-content-faint"
    >
      {pending ? <Spinner size={16} /> : null}
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}
