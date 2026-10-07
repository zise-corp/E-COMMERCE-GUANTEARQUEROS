import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartProvider } from "@/components/shop/CartProvider";
import { ContactProvider } from "@/components/shop/ContactProvider";
import { Footer } from "@/components/shop/Footer";
import { FloatingWhatsapp } from "@/components/shop/FloatingWhatsapp";
import { Header } from "@/components/shop/Header";
import { StoreIntro } from "@/components/shop/StoreIntro";
import { ToastProvider } from "@/components/ui/Toast";
import { getNavCategories } from "@/db/queries/catalog";
import { getContactSettings } from "@/db/queries/settings";
import { absoluteUrl, serializeJsonLd } from "@/lib/seo";
import { site, STORE_LOCATIONS } from "@/lib/site";

export const revalidate = 300;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, contact] = await Promise.all([getNavCategories(), getContactSettings()]);
  const phone = contact.supportWhatsapp;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        alternateName: site.shortName,
        url: site.url,
        logo: absoluteUrl("/brand/escudo-guantearqueros.png"),
        sameAs: [site.social.facebook, site.social.instagram, site.social.tiktok],
        areaServed: { "@type": "Country", name: "Bolivia" },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "atención al cliente",
          telephone: `+${phone}`,
          areaServed: "BO",
          availableLanguage: "Spanish",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        alternateName: site.shortName,
        url: site.url,
        inLanguage: site.locale,
        publisher: { "@id": `${site.url}/#organization` },
      },
      ...STORE_LOCATIONS.map((location) => ({
        "@type": "Store",
        "@id": `${site.url}/#tienda-${location.city.toLowerCase().replace(/\s+/g, "-")}`,
        name: `${site.name} - ${location.short}, ${location.city}`,
        url: site.url,
        image: absoluteUrl("/brand/escudo-guantearqueros.png"),
        parentOrganization: { "@id": `${site.url}/#organization` },
        address: {
          "@type": "PostalAddress",
          streetAddress: location.address,
          addressLocality: location.city,
          addressCountry: "BO",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: location.lat,
          longitude: location.lng,
        },
        hasMap: location.mapsUrl,
      })),
    ],
  };

  return (
    <ContactProvider phone={phone}>
      <CartProvider>
        <ToastProvider>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
          <StoreIntro />
          <div className="shop-frame flex min-h-dvh flex-col">
            <Header categories={categories} />
            <main className="flex-1">{children}</main>
            <Footer categories={categories} phone={phone} />
          </div>
          <CartDrawer />
          <FloatingWhatsapp phone={phone} />
        </ToastProvider>
      </CartProvider>
    </ContactProvider>
  );
}
