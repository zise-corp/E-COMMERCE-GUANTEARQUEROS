"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveContactSettingsAction } from "@/app/admin/actions";
import type { ContactSettings } from "@/db/queries/settings";
import { useToast } from "@/components/ui/Toast";

export function ContactSettingsForm({ initial }: { initial: ContactSettings }) {
  const [phone, setPhone] = useState(initial.supportWhatsapp);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveContactSettingsAction({ supportWhatsapp: phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhone(phone.replace(/\D/g, ""));
      show("Número de contacto actualizado.");
      router.refresh();
    });
  }

  return (
    <section className="admin-panel border border-ink-700 bg-ink-850 p-5">
      <h2 className="text-[14px] font-extrabold uppercase tracking-[0.08em]">Contacto de Guante Arqueros</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-content-dim">
        Este número se usa en Contacto, el WhatsApp del pie y el botón flotante, el enlace de ayuda y el soporte de pedidos. DREI conserva su propio número.
      </p>
      <label className="mt-4 block max-w-md">
        <span className="label-xs mb-1.5 block text-content-dim">WhatsApp con código de país</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="59161234567"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "contact-phone-error" : undefined}
          className="w-full border border-line-strong bg-ink-950 px-3 py-3 outline-none focus:border-brand"
        />
      </label>
      {error ? <p id="contact-phone-error" role="alert" className="mt-2 text-sm text-alert-soft">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="mt-4 bg-brand px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar número"}
      </button>
    </section>
  );
}
