import { site } from "@/lib/site";

export function absoluteUrl(path: string): string {
  return new URL(path, `${site.url}/`).href;
}

export function seoDescription(text: string, fallback: string = site.tagline): string {
  const clean = text.replace(/\s+/g, " ").trim() || fallback;
  return clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}…` : clean;
}

const CATEGORY_SEARCH_TERMS: Record<string, { description: string; keywords: string[] }> = {
  guantes: {
    description: "Guantes de arquero y portero para competición, entrenamiento y niños. Modelos para fútbol con envíos a toda Bolivia.",
    keywords: ["guantes de arquero Bolivia", "guantes de portero Bolivia", "guantes para fútbol", "guantes de arquero para niños"],
  },
  poleras: {
    description: "Poleras y camisetas de arquero, uniformes de fútbol y calzas deportivas DREI Athletic. Indumentaria deportiva en Bolivia.",
    keywords: ["poleras deportivas Bolivia", "camisetas de arquero", "uniformes de fútbol Bolivia", "calzas para arquero"],
  },
  botas: {
    description: "Botines de fútbol para césped firme y calzado de futsal. Encuentra botas deportivas con envíos a toda Bolivia.",
    keywords: ["botines de fútbol Bolivia", "botas de fútbol Bolivia", "calzado de futsal", "botines para césped firme"],
  },
  pelotas: {
    description: "Pelotas de fútbol N°4 y N°5 para entrenamiento y partido. Compra equipamiento deportivo con envíos a toda Bolivia.",
    keywords: ["pelotas de fútbol Bolivia", "balones de fútbol", "pelota número 4", "pelota número 5"],
  },
  canilleras: {
    description: "Canilleras y espinilleras de fútbol para entrenar y jugar con protección. Compra online en Bolivia.",
    keywords: ["canilleras de fútbol Bolivia", "espinilleras de fútbol", "protección para fútbol"],
  },
  accesorios: {
    description: "Accesorios deportivos y de fútbol para completar tu equipamiento de arquero y jugador. Compra online en Bolivia.",
    keywords: ["accesorios de fútbol Bolivia", "accesorios deportivos Bolivia", "equipamiento de arquero"],
  },
  medias: {
    description: "Medias deportivas y de fútbol para entrenamientos y partidos. Compra indumentaria deportiva online en Bolivia.",
    keywords: ["medias deportivas Bolivia", "medias de fútbol", "indumentaria de fútbol Bolivia"],
  },
  ofertas: {
    description: "Ofertas vigentes en guantes de arquero, indumentaria y equipamiento de fútbol en Bolivia.",
    keywords: ["ofertas deportivas Bolivia", "ofertas de fútbol Bolivia", "guantes de arquero en oferta"],
  },
  nuevos: {
    description: "Novedades en guantes de arquero, indumentaria y accesorios de fútbol disponibles en Bolivia.",
    keywords: ["novedades deportivas Bolivia", "nuevos guantes de arquero", "indumentaria de fútbol nueva"],
  },
};

export function categorySearchContent(name: string, slug: string, parentName?: string) {
  if (parentName) {
    const description = `${name} en ${parentName.toLowerCase()} para fútbol y deporte en Bolivia. Compra online en ${site.name} con envíos a todo el país.`;
    return {
      description: seoDescription(description),
      intro: description,
      keywords: [`${name} ${parentName} Bolivia`, `${parentName} ${name} para fútbol`, `comprar ${parentName.toLowerCase()} en Bolivia`],
    };
  }

  const terms = CATEGORY_SEARCH_TERMS[slug];
  const description = terms?.description ?? `Compra ${name.toLowerCase()} para fútbol y deporte en Bolivia. Explora el catálogo de ${site.name} con envíos a todo el país.`;
  return {
    description: seoDescription(description),
    intro: description,
    keywords: terms?.keywords ?? [`${name} Bolivia`, `comprar ${name.toLowerCase()} en Bolivia`],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
