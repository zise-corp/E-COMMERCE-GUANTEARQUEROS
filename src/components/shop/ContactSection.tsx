import { Display } from "@/components/ui/Heading";
import { ArrowRightIcon, WhatsappIcon } from "@/components/ui/Icons";
import { displayWhatsapp, whatsappLink } from "@/lib/site";

const CONTACT_MESSAGE = "Hola, necesito ayuda o información de Guantearqueros Bolivia.";

export function ContactSection() {
  return (
    <section className="container-shop mb-16" aria-labelledby="contact-title">
      <div className="relative overflow-hidden border border-brand bg-ink-900 px-6 py-8 clip-corner sm:px-9 sm:py-10 lg:px-12">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-brand/[0.12] blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-[720px]">
            <p className="label-xs tracking-[0.18em] text-brand">Contacto</p>
            <Display id="contact-title" as="h2" size="md" className="mt-2">
              ¿Necesitas ayuda?
            </Display>
            <p className="mt-3 max-w-[650px] text-[13.5px] leading-relaxed text-content-muted sm:text-sm">
              Escríbenos directamente por WhatsApp para resolver dudas sobre productos, compras, pedidos, envíos o cualquier inconveniente.
            </p>
          </div>

          <a
            href={whatsappLink(CONTACT_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contactar por WhatsApp al ${displayWhatsapp()}`}
            className="group inline-flex min-w-[245px] items-center justify-between gap-5 bg-brand px-5 py-4 text-ink-950 transition-colors duration-150 hover:bg-brand-hot sm:px-6"
          >
            <span className="flex items-center gap-3">
              <WhatsappIcon size={22} />
              <span>
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em]">WhatsApp</span>
                <span className="mt-0.5 block text-sm font-extrabold tabular">{displayWhatsapp()}</span>
              </span>
            </span>
            <ArrowRightIcon size={18} className="transition-transform duration-150 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
