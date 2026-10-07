import Link from "next/link";
import { Escudo } from "@/components/brand/Escudo";
import { Wordmark } from "@/components/brand/Wordmark";
import { FacebookIcon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@/components/ui/Icons";
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
            "repeating-linear-gradient(115deg, #EB611C 0 18px, #0A0A0A 18px 36px)",
        }}
        aria-hidden
      />

      <div className="container-shop grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-0">
            <Escudo width={26} height={31} />
            <Wordmark size={22} withBolivia className="ml-[2px]" />
          </div>
          <p className="mt-3.5 max-w-[300px] text-[13.5px] leading-relaxed text-content-dim">
            Guantes de arquero, indumentaria DREI Athletic, botines, pelotas y accesorios. Envíos a toda Bolivia.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SocialGroup title={site.shortName} label={`Redes sociales de ${site.name}`}>
              <SocialLink href={site.social.facebook} label={`Facebook de ${site.name}`}>
                <FacebookIcon size={18} />
              </SocialLink>
              <SocialLink href={site.social.instagram} label={`Instagram de ${site.name}`}>
                <InstagramIcon size={18} />
              </SocialLink>
              <SocialLink href={site.social.tiktok} label={`TikTok de ${site.name}`}>
                <TiktokIcon size={18} />
              </SocialLink>
              <SocialLink href={whatsappLink("Hola, quisiera información sobre sus productos.")} label={`WhatsApp de ${site.shortName}`}>
                <WhatsappIcon size={18} />
              </SocialLink>
            </SocialGroup>

            <SocialGroup title="DREI" label="Redes sociales de DREI Bolivia">
              <SocialLink href={site.social.dreiFacebook} label="Facebook de DREI Bolivia">
                <FacebookIcon size={18} />
              </SocialLink>
              <SocialLink href={site.social.dreiInstagram} label="Instagram de DREI Bolivia">
                <InstagramIcon size={18} />
              </SocialLink>
              <SocialLink href={whatsappLink("Hola, quisiera información sobre DREI Bolivia.", site.dreiWhatsapp)} label="WhatsApp de DREI Bolivia">
                <WhatsappIcon size={18} />
              </SocialLink>
            </SocialGroup>
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
        <div className="container-shop flex flex-col items-center justify-center gap-2.5 py-5 text-center">
          <p className="text-[11px] leading-relaxed text-content-faint">
            © {year} {site.name}. Todos los derechos reservados.
          </p>
          <a
            href={site.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visitar el sitio de ZISE"
            className="group inline-flex items-center gap-2.5 py-0.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="h-px w-8 bg-line-strong transition-colors group-hover:bg-brand/70" aria-hidden />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-content-dim transition-colors group-hover:text-brand">
              ZISE
            </span>
            <span className="h-px w-8 bg-line-strong transition-colors group-hover:bg-brand/70" aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}

function SocialGroup({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-content-muted">{title}</h2>
      <div className="flex flex-wrap items-center gap-2" aria-label={label}>{children}</div>
    </div>
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
