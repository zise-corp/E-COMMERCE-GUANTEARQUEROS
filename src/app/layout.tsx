import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DelayedNavigationLoader } from "@/components/ui/DelayedNavigationLoader";
import { anton, manrope } from "@/lib/fonts";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Indumentaria deportiva y fútbol en Bolivia`,
    template: `%s | ${site.shortName}`,
  },
  description:
    "Tienda de indumentaria deportiva y fútbol en Bolivia: guantes de arquero, camisetas, uniformes, botines, pelotas y accesorios. Envíos a todo el país.",
  applicationName: site.name,
  authors: [{ name: site.name }],
  keywords: [
    "Guante Arqueros Bolivia",
    "Guante Arqueros Cochabamba",
    "Guante Arqueros Santa Cruz",
    "Guante Arqueros La Paz",
    "Guante Arqueros Sucre",
    "Guante Arqueros Tarija",
    "tienda de indumentaria deportiva Bolivia",
    "tienda de indumentaria deportiva Cochabamba",
    "tienda de indumentaria deportiva Santa Cruz",
    "tienda de indumentaria deportiva La Paz",
    "tienda de indumentaria deportiva Sucre",
    "tienda de indumentaria deportiva Tarija",
    "ropa deportiva para fútbol Bolivia",
    "ropa deportiva para fútbol Cochabamba",
    "ropa deportiva para fútbol Santa Cruz",
    "ropa deportiva para fútbol La Paz",
    "ropa deportiva para fútbol Sucre",
    "ropa deportiva para fútbol Tarija",
    "indumentaria de fútbol Bolivia",
    "indumentaria de fútbol Cochabamba",
    "indumentaria de fútbol Santa Cruz",
    "indumentaria de fútbol La Paz",
    "indumentaria de fútbol Sucre",
    "indumentaria de fútbol Tarija",
    "equipamiento deportivo Bolivia",
    "equipamiento deportivo Cochabamba",
    "equipamiento deportivo Santa Cruz",
    "equipamiento deportivo La Paz",
    "equipamiento deportivo Sucre",
    "equipamiento deportivo Tarija",
    "ropa de arquero Bolivia",
    "ropa de arquero Cochabamba",
    "ropa de arquero Santa Cruz",
    "ropa de arquero La Paz",
    "ropa de arquero Sucre",
    "ropa de arquero Tarija",
    "guantes para arquero Bolivia",
    "guantes para arquero Cochabamba",
    "guantes para arquero Santa Cruz",
    "guantes para arquero La Paz",
    "guantes para arquero Sucre",
    "guantes para arquero Tarija",
    "guantes de portero Bolivia",
    "guantes de portero Cochabamba",
    "guantes de portero Santa Cruz",
    "guantes de portero La Paz",
    "guantes de portero Sucre",
    "guantes de portero Tarija",
    "camisetas de arquero Bolivia",
    "camisetas de arquero Cochabamba",
    "camisetas de arquero Santa Cruz",
    "camisetas de arquero La Paz",
    "camisetas de arquero Sucre",
    "camisetas de arquero Tarija",
    "uniformes deportivos Bolivia",
    "uniformes deportivos Cochabamba",
    "uniformes deportivos Santa Cruz",
    "uniformes deportivos La Paz",
    "uniformes deportivos Sucre",
    "uniformes deportivos Tarija",
    "botines de fútbol Bolivia",
    "botines de fútbol Cochabamba",
    "botines de fútbol Santa Cruz",
    "botines de fútbol La Paz",
    "botines de fútbol Sucre",
    "botines de fútbol Tarija",
    "pelotas de fútbol Bolivia",
    "pelotas de fútbol Cochabamba",
    "pelotas de fútbol Santa Cruz",
    "pelotas de fútbol La Paz",
    "pelotas de fútbol Sucre",
    "pelotas de fútbol Tarija",
    "canilleras de fútbol Bolivia",
    "canilleras de fútbol Cochabamba",
    "canilleras de fútbol Santa Cruz",
    "canilleras de fútbol La Paz",
    "canilleras de fútbol Sucre",
    "canilleras de fútbol Tarija",
    "medias deportivas Bolivia",
    "medias deportivas Cochabamba",
    "medias deportivas Santa Cruz",
    "medias deportivas La Paz",
    "medias deportivas Sucre",
    "medias deportivas Tarija",
    "accesorios de fútbol Bolivia",
    "accesorios de fútbol Cochabamba",
    "accesorios de fútbol Santa Cruz",
    "accesorios de fútbol La Paz",
    "accesorios de fútbol Sucre",
    "accesorios de fútbol Tarija",
    "DREI Athletic Bolivia",
    "DREI Athletic Cochabamba",
    "DREI Athletic Santa Cruz",
    "DREI Athletic La Paz",
    "DREI Athletic Sucre",
    "DREI Athletic Tarija",
    "tienda de fútbol Bolivia",
    "tienda de fútbol La Paz",
    "tienda de fútbol Santa Cruz",
    "tienda de fútbol Cochabamba",
    "tienda de fútbol Sucre",
    "tienda de fútbol Tarija",
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
    title: `${site.name} | Indumentaria deportiva y fútbol en Bolivia`,
    description: "Tienda de indumentaria deportiva y fútbol: guantes de arquero, camisetas, uniformes, botines, pelotas y accesorios. Envíos a toda Bolivia.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${manrope.variable}`}>
      <body>
        {children}
        <Suspense fallback={null}>
          <DelayedNavigationLoader />
        </Suspense>
      </body>
    </html>
  );
}
