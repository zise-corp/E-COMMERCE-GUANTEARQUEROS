"use client";

import { useState, useTransition } from "react";
import { superAdminResetPasswordAction } from "@/app/admin/superadmin/actions";
import { Input } from "@/components/ui/Field";
import { EyeIcon, EyeOffIcon, ShieldIcon } from "@/components/ui/Icons";

type PasswordField = "next" | "confirm";

export function SuperAdminPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({ next: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(field: PasswordField) {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  }

  function visibilityButton(field: PasswordField, shown: boolean, label: string) {
    return (
      <button
        type="button"
        onClick={() => toggle(field)}
        aria-label={`${shown ? "Ocultar" : "Mostrar"} ${label}`}
        className="text-content-dim transition-colors hover:text-brand"
      >
        {shown ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await superAdminResetPasswordAction({ newPassword, confirmPassword });
      if (!result.ok) {
        setError(result.error ?? "No pudimos actualizar la contraseña.");
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={submit} className="border border-line-strong bg-ink-850 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      <div className="flex items-start gap-4 border-b border-line-soft p-5 sm:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center border border-brand/60 bg-brand/[0.08] text-brand">
          <ShieldIcon size={21} />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-brand">Cuenta objetivo</p>
          <h2 className="mt-1 font-display text-[25px] uppercase tracking-[0.025em] skew-fast-6">Administrador Guante Arqueros</h2>
          <p className="mt-1 text-[12px] text-content-dim">Usuario: <strong className="text-content">admin</strong></p>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="border-l-[3px] border-brand bg-brand/[0.06] px-4 py-3 text-[12px] leading-relaxed text-content-muted">
          Este cambio no revela la contraseña anterior. Al guardar se cerrarán todas las sesiones abiertas del administrador de la tienda.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nueva contraseña"
            required
            type={visible.next ? "text" : "password"}
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            hint="Mínimo 10 caracteres."
            value={newPassword}
            onChange={(event) => { setNewPassword(event.target.value); setError(null); setSuccess(false); }}
            endAdornment={visibilityButton("next", visible.next, "la nueva contraseña")}
          />
          <Input
            label="Confirmar contraseña"
            required
            type={visible.confirm ? "text" : "password"}
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => { setConfirmPassword(event.target.value); setError(null); setSuccess(false); }}
            endAdornment={visibilityButton("confirm", visible.confirm, "la confirmación")}
          />
        </div>

        {error ? (
          <p role="alert" className="border-l-[3px] border-alert bg-alert/[0.08] px-3.5 py-3 text-[12.5px] text-alert-soft">{error}</p>
        ) : null}
        {success ? (
          <p role="status" className="border-l-[3px] border-state-ok bg-state-ok/[0.09] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#8FD9A6]">
            Contraseña de <strong>admin</strong> actualizada. Sus sesiones anteriores quedaron cerradas.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !newPassword || !confirmPassword}
          className="w-full bg-brand px-6 py-4 text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink-950 transition-colors hover:bg-brand-hot disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-content-faint"
        >
          {pending ? "Actualizando acceso…" : "Establecer nueva contraseña"}
        </button>
      </div>
    </form>
  );
}
