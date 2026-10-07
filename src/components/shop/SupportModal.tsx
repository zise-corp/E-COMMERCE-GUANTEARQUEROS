"use client";

import { Modal } from "@/components/ui/Modal";
import { WhatsappIcon } from "@/components/ui/Icons";
import { displayWhatsapp, whatsappLink } from "@/lib/site";
import { useContactPhone } from "./ContactProvider";

export function SupportModal({
  open,
  onClose,
  orderNumber,
}: {
  open: boolean;
  onClose: () => void;
  orderNumber: number | null;
}) {
  const phone = useContactPhone();

  const reference = orderNumber ? `#${orderNumber}` : "";
  const message = orderNumber
    ? `Hola, necesito ayuda con mi pedido ${reference} de Guante Arqueros.`
    : "Hola, necesito ayuda con una compra en Guante Arqueros.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Soporte"
      description={
        orderNumber
          ? `Pedido ${reference} · te respondemos en horario comercial.`
          : "Te respondemos en horario comercial."
      }
      width={420}
    >
      <div>
        <a
          href={whatsappLink(message, phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 border border-brand bg-brand/[0.07] p-3.5 transition-colors duration-150 hover:bg-brand/[0.14]"
        >
          <div className="min-w-0">
            <p className="label-xs tracking-[0.14em] text-content-dim">WhatsApp</p>
            <p className="mt-[3px] text-sm font-bold text-content">{displayWhatsapp(phone)}</p>
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
