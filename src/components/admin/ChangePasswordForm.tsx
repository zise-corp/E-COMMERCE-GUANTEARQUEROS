"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/admin/actions";
import { Input } from "@/components/ui/Field";
import { EyeIcon, EyeOffIcon, ShieldIcon } from "@/components/ui/Icons";
import { site } from "@/lib/site";

type PasswordField = "current" | "next" | "confirm";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({ current: false, next: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(field: PasswordField) {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign("/admin/login?passwordChanged=1");
    });
  }

  const visibilityButton = (field: PasswordField, shown: boolean, label: string) => (
    <button
      type="button"
      onClick={() => toggle(field)}
      aria-label={`${shown ? "Ocultar" : "Mostrar"} ${label}`}
      className="text-content-dim transition-colors hover:text-brand"
    >
      {shown ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
    </button>
  );

  return (
    <div className="grid max-w-5xl items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)]">
      <form onSubmit={submit} className="admin-panel border border-ink-700 bg-ink-850">
        <div className="flex items-start gap-4 border-b border-ink-700 p-5 sm:p-6">
          <span className="flex size-11 shrink-0 items-center justify-center border border-brand/60 bg-brand/[0.08] text-brand">
            <ShieldIcon size={21} />
          </span>
          <div>
            <h2 className="text-[14px] font-extrabold uppercase tracking-[0.08em]">Cambiar contraseña</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-content-dim">
              Confirma primero tu contraseña actual. Por seguridad, al guardar se cerrará la sesión.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <Input
            label="Contraseña actual"
            required
            type={visible.current ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => { setCurrentPassword(event.target.value); setError(null); }}
            endAdornment={visibilityButton("current", visible.current, "la contraseña actual")}
          />

          <div className="grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
            <Input
              label="Nueva contraseña"
              required
              type={visible.next ? "text" : "password"}
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              hint="Mínimo 10 caracteres."
              value={newPassword}
              onChange={(event) => { setNewPassword(event.target.value); setError(null); }}
              endAdornment={visibilityButton("next", visible.next, "la nueva contraseña")}
            />
            <Input
              label="Confirmar nueva contraseña"
              required
              type={visible.confirm ? "text" : "password"}
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => { setConfirmPassword(event.target.value); setError(null); }}
              endAdornment={visibilityButton("confirm", visible.confirm, "la confirmación de contraseña")}
            />
          </div>

          {error ? (
            <p role="alert" className="border-l-[3px] border-alert bg-alert/[0.08] px-3.5 py-3 text-[12.5px] text-alert-soft">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line-soft pt-5 sm:flex-row sm:items-center">
            <p className="max-w-sm text-[11px] leading-relaxed text-content-faint">
              Al guardar se cerrarán automáticamente todas las sesiones administrativas, incluida esta.
            </p>
            <button
              type="submit"
              disabled={pending || !currentPassword || !newPassword || !confirmPassword}
              className="bg-brand px-6 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-950 transition-colors hover:bg-brand-hot disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-content-faint"
            >
              {pending ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </div>
        </div>
      </form>

      <aside className="admin-panel border border-ink-700 bg-ink-850 p-5 sm:p-6">
        <p className="label-xs text-brand">Recuperación segura</p>
        <h2 className="mt-3 font-display text-2xl uppercase skew-fast-6">¿No recuerdas la actual?</h2>
        <p className="mt-3 text-[12.5px] leading-relaxed text-content-muted">
          Si olvidaste la contraseña actual, contacta a ZISE para verificar la solicitud y restablecer el acceso de forma segura.
        </p>
        <a
          href={site.supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center border border-brand px-5 py-3.5 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-brand transition-colors hover:bg-brand hover:text-ink-950"
        >
          Contactar a ZISE
        </a>
        <p className="mt-3 text-center text-[10.5px] uppercase tracking-[0.12em] text-content-faint">zise.lat</p>
      </aside>
    </div>
  );
}
