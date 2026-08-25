"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from "@/components/ui/Icons";
import { loginAction, type LoginState } from "@/app/admin/login/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-6"
      style={{ background: "radial-gradient(80% 60% at 50% 0%, #1A1512 0%, #0A0A0A 60%)" }}
    >
      <form
        action={formAction}
        className="w-full max-w-[400px] border border-line-strong bg-ink-850 p-8 animate-rise"
      >
        <div className="flex items-center gap-0">
          <Escudo width={28} height={33} />
          <Wordmark size={17} className="ml-[2px]" />
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
            type={showPassword ? "text" : "password"}
            label="Contraseña"
            autoComplete="current-password"
            required
            className="bg-[#0E0E0D]"
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="flex size-8 items-center justify-center text-content-dim transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            }
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

          <Link
            href="/"
            className="flex items-center justify-center gap-2 border border-line-strong px-4 py-[13px] text-[12px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            <ArrowLeftIcon size={15} />
            Volver a la tienda
          </Link>
        </div>
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
