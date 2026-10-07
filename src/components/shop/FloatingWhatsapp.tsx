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
      // Alineado al carrito del header: usa el mismo offset derecho que el
      // padding-inline del `.shop-header-inner` en cada breakpoint (20px / 32px
      // / 56px / 72px). Así, el borde derecho del WhatsApp queda a la misma
      // línea vertical que el borde derecho del botón del carrito arriba.
      // La cápsula es levemente más grande que el carrito (44→48px vs 42px)
      // para marcar jerarquía de botón flotante sin ser desproporcionada.
      className="group fixed bottom-5 right-5 z-[35] flex size-11 items-stretch bg-[linear-gradient(145deg,#ff7a3d,#eb611c_55%,#943b10)] p-px shadow-[0_14px_34px_rgba(0,0,0,0.55),0_0_20px_rgba(235,97,28,0.12)] transition-[transform,filter,box-shadow] duration-200 [clip-path:polygon(0_13px,13px_0,100%_0,100%_100%,0_100%)] hover:-translate-y-1 hover:brightness-110 hover:shadow-[0_18px_38px_rgba(0,0,0,0.58),0_0_24px_rgba(235,97,28,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 sm:bottom-8 sm:right-8 sm:size-12 min-[1280px]:right-14 min-[1600px]:right-[72px]"
    >
      <span className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_35%_28%,#242422,#0d0d0c_62%)] text-content [clip-path:polygon(0_12px,12px_0,100%_0,100%_100%,0_100%)]">
        <span className="absolute bottom-0 left-0 h-[3px] w-6 bg-brand shadow-[0_0_10px_rgba(235,97,28,0.65)] transition-[width] duration-200 group-hover:w-full" aria-hidden />
        <WhatsappIcon size={25} strokeWidth={1.9} className="relative text-[#f1fff6] [filter:drop-shadow(0_0_6px_rgba(37,211,102,0.76))] transition-[color,transform,filter] duration-200 group-hover:scale-110 group-hover:text-white group-hover:[filter:drop-shadow(0_0_9px_rgba(37,211,102,0.96))]" />
      </span>
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}
