import { WhatsappIcon } from "@/components/ui/Icons";
import { whatsappLink } from "@/lib/site";

const MESSAGE = "Hola, quisiera información sobre sus productos.";

export function FloatingWhatsapp() {
  return (
    <a
      href={whatsappLink(MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar directamente por WhatsApp"
      title="Contactar por WhatsApp"
      className="group fixed bottom-5 right-5 z-[35] flex size-14 items-center justify-center rounded-full border border-white/20 bg-[#25D366] text-white shadow-[0_14px_36px_rgba(0,0,0,0.45)] transition-[background-color,transform,box-shadow] duration-200 hover:scale-105 hover:bg-[#20BD5A] hover:shadow-[0_18px_42px_rgba(37,211,102,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 sm:bottom-7 sm:right-7 sm:size-[60px]"
    >
      <WhatsappIcon size={29} strokeWidth={1.8} />
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}
