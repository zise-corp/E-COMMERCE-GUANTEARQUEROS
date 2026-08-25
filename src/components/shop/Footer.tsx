import Link from "next/link";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "@/components/ui/Icons";
import { site, whatsappLink } from "@/lib/site";
import type { NavCategory } from "./Header";

export function Footer({ categories }: { categories: NavCategory[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-ink-900">
      {/* Franja diagonal de 8px: el mismo gesto que la campaña, en chico. */}
      <div
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #FA2A00 0 18px, #0A0A0A 18px 36px)",
        }}
        aria-hidden
      />

      <div className="container-shop grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-1">
            <Escudo width={26} height={31} />
            <Wordmark size={22} withBolivia />
          </div>
          <p className="mt-3.5 max-w-[300px] text-[13.5px] leading-relaxed text-content-dim">
            Guantes de arquero, indumentaria DREI Athletic y accesorios. {site.city}, {site.country}.
          </p>
          <div className="mt-5 flex items-center gap-2" aria-label="Redes sociales">
            <SocialLink href={site.social.facebook} label="Facebook de Guantearqueros Bolivia">
              <FacebookIcon size={18} />
            </SocialLink>
            <SocialLink href={site.social.facebookSecondary} label="Segunda página de Facebook">
              <FacebookIcon size={18} />
            </SocialLink>
            <SocialLink href={site.social.instagram} label="Instagram de Guantearqueros Bolivia">
              <InstagramIcon size={18} />
            </SocialLink>
            <SocialLink
              href={whatsappLink("Hola, quisiera información sobre sus productos.")}
              label="Contactar por WhatsApp"
            >
              <WhatsappIcon size={18} />
            </SocialLink>
          </div>
        </div>

        <FooterColumn
          title="Tienda"
          items={categories.map((c) => ({ label: c.name, href: `/${c.slug}` }))}
        />
        <FooterColumn
          title="Ayuda"
          items={[
            { label: "Guía de tallas", href: "/ayuda/tallas" },
            { label: "Envíos y transporte", href: "/ayuda/envios" },
            { label: "Cambios", href: "/ayuda/cambios" },
            { label: "Contacto", href: `mailto:${site.supportEmail}` },
          ]}
        />
        <FooterColumn
          title="Marcas"
          items={[
            { label: "Buffon", href: "/guantes" },
            { label: "Uhlsport", href: "/guantes" },
            { label: "HO Soccer", href: "/guantes" },
            { label: "DREI Athletic", href: "/drei" },
          ]}
        />
      </div>

      <div className="border-t border-ink-800">
        <div className="container-shop flex flex-wrap justify-between gap-2 py-[18px] text-xs text-[#4A4845]">
          <span>
            © {year} {site.name} · DREI Athletic
          </span>
          <span>Pagos vía YoPago · Bs</span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center border border-line-strong text-content-dim transition-colors duration-150 hover:border-brand hover:bg-brand/[0.08] hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </a>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="label-xs mb-3.5 tracking-[0.18em] text-content">{title}</h2>
      <ul>
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="block py-[5px] text-[13.5px] text-content-dim transition-colors duration-150 hover:text-brand"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
