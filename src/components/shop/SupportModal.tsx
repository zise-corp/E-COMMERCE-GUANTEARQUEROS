"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CopyIcon, WhatsappIcon } from "@/components/ui/Icons";
import { displayWhatsapp, site, whatsappLink } from "@/lib/site";

export function SupportModal({
  open,
  onClose,
  orderNumber,
}: {
  open: boolean;
  onClose: () => void;
  orderNumber: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const reference = orderNumber ? `#${orderNumber}` : "";
  const message = orderNumber
    ? `Hola, necesito ayuda con mi pedido ${reference} de Guantearqueros.`
    : "Hola, necesito ayuda con una compra en Guantearqueros.";

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el correo igual está a la vista para copiarlo a mano.
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setCopied(false);
        onClose();
      }}
      title="Soporte"
      description={
        orderNumber
          ? `Pedido ${reference} · te respondemos en horario comercial.`
          : "Te respondemos en horario comercial."
      }
      width={420}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3 border border-line-strong p-3.5">
          <div className="min-w-0">
            <p className="label-xs tracking-[0.14em] text-content-dim">Email</p>
            <p className="mt-[3px] truncate text-sm font-bold">{site.supportEmail}</p>
          </div>
          <button
            type="button"
            onClick={copyEmail}
            className="flex flex-none items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-brand transition-colors duration-150 hover:text-brand-hot"
          >
            <CopyIcon size={13} />
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <a
          href={whatsappLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 border border-brand bg-brand/[0.07] p-3.5 transition-colors duration-150 hover:bg-brand/[0.14]"
        >
          <div className="min-w-0">
            <p className="label-xs tracking-[0.14em] text-content-dim">WhatsApp</p>
            <p className="mt-[3px] text-sm font-bold text-content">{displayWhatsapp()}</p>
          </div>
          <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-brand">
            <WhatsappIcon size={14} />
            Abrir chat
          </span>
        </a>
      </div>
    </Modal>
  );
}
