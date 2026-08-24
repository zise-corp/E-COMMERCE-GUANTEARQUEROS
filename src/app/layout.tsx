import type { Metadata, Viewport } from "next";
import { anton, manrope } from "@/lib/fonts";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · Guantes de arquero y DREI Athletic`,
    template: `%s · ${site.shortName}`,
  },
  description:
    "Guantes de arquero originales Buffon, HO Soccer, Uhlsport, Elite y GXP, indumentaria DREI Athletic y accesorios. Envíos a toda Bolivia, retiro en Cochabamba.",
  applicationName: site.name,
  authors: [{ name: site.name }],
  keywords: [
    "guantes de arquero",
    "guantes de portero Bolivia",
    "DREI Athletic",
    "Cochabamba",
    "Buffon",
    "HO Soccer",
    "Uhlsport",
  ],
  icons: {
    icon: [
      { url: "/brand/escudo-guantearqueros.svg", type: "image/svg+xml" },
      { url: "/brand/escudo-guantearqueros.png", type: "image/png" },
    ],
    apple: "/brand/escudo-guantearqueros.png",
  },
  openGraph: {
    type: "website",
    locale: "es_BO",
    url: site.url,
    siteName: site.name,
    title: `${site.name} · Guantes de arquero y DREI Athletic`,
    description: site.tagline,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
