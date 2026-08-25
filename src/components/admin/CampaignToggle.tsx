"use client";

import { useState, useTransition } from "react";
import { saveCampaignAction } from "@/app/admin/actions";
import { Toggle } from "@/components/ui/Toggle";
import { Input } from "@/components/ui/Field";
import type { CampaignSettings } from "@/db/queries/settings";

/** Control de la franja de campaña de la tienda. */
export function CampaignToggle({ campaign }: { campaign: CampaignSettings }) {
  const [enabled, setEnabled] = useState(campaign.enabled);
  const [messages, setMessages] = useState<string[]>(
    campaign.messages.length > 0 ? campaign.messages : [""],
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function save(nextEnabled = enabled, nextMessages = messages) {
    const clean = nextMessages.map((m) => m.trim()).filter(Boolean);
    if (clean.length === 0) {
      setFeedback("Escribe al menos una frase.");
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await saveCampaignAction({ enabled: nextEnabled, messages: clean });
      setFeedback(result.ok ? "Guardado." : result.error);
    });
  }

  return (
    <div className="border border-ink-700 bg-ink-850 p-5">
      <h2 className="text-[13.5px] font-extrabold uppercase tracking-[0.08em]">
        Franja de campaña
      </h2>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-content-dim">
        La banda naranja que cruza la tienda arriba del todo.
      </p>

      <div className="mt-4 border border-ink-700 bg-[#0E0E0D] p-3.5">
        <Toggle
          checked={enabled}
          label="Mostrar en la tienda"
          onChange={(next) => {
            setEnabled(next);
            save(next);
          }}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <Input
            key={i}
            value={m}
            aria-label={`Frase ${i + 1}`}
            placeholder="DESCUENTOS EN TODA LA TIENDA"
            className="bg-[#0E0E0D]"
            onChange={(e) => {
              const next = messages.slice();
              next[i] = e.target.value;
              setMessages(next);
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {messages.length < 6 ? (
          <button
            type="button"
            onClick={() => setMessages([...messages, ""])}
            className="border border-line-strong px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            + Frase
          </button>
        ) : null}
        {messages.length > 1 ? (
          <button
            type="button"
            onClick={() => setMessages(messages.slice(0, -1))}
            className="border border-line-strong px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-content-muted transition-colors duration-150 hover:border-alert hover:text-alert-soft"
          >
            Quitar última
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => save()}
          disabled={pending}
          className="ml-auto bg-brand px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-950 transition-colors duration-150 hover:bg-brand-hot disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {feedback ? (
        <p className="mt-2.5 text-[11.5px] text-content-muted" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
