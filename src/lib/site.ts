/**
 * Configuración del negocio. Todo lo que el dueño podría querer cambiar sin tocar
 * componentes vive acá o en variables de entorno.
 */

export const site = {
  name: "Guantearqueros Bolivia",
  shortName: "Guantearqueros",
  tagline: "Guantes de arquero, indumentaria DREI Athletic y accesorios.",
  city: "Cochabamba",
  country: "Bolivia",
  currency: "BOB",
  locale: "es-BO",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://guantearquerosbolivia.com.bo").replace(
    /\/+$/,
    "",
  ),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "ventas@guantearquerosbolivia.com.bo",
  /** Solo dígitos, formato internacional: se usa en el link de wa.me. */
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "59161235265",
  social: {
    facebook: "https://www.facebook.com/guantearqueros.bolivia",
    facebookSecondary: "https://www.facebook.com/profile.php?id=61552525021314",
    instagram: "https://www.instagram.com/guantearquerosbolivia_oficial",
    tiktok: "https://www.tiktok.com/@guantearqueros.bo",
  },
} as const;

/** Cómo se muestra el WhatsApp en pantalla: +591 61235265 */
export function displayWhatsapp(digits: string = site.supportWhatsapp): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("591")) {
    return `+591 ${d.slice(3)}`;
  }
  return `+${d}`;
}

export function whatsappLink(message: string): string {
  return `https://wa.me/${site.supportWhatsapp}?text=${encodeURIComponent(message)}`;
}

/** Los 10 departamentos/ciudades de despacho, en el orden del prototipo. */
export const DEPARTMENTS = [
  "Cochabamba",
  "La Paz",
  "El Alto",
  "Santa Cruz",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

/** La Paz es la sede principal: permite retiro o entrega con ubicación exacta. */
export const LOCAL_DEPARTMENT: Department = "La Paz";

export function isLocalDepartment(dept: string | null | undefined): boolean {
  return dept === LOCAL_DEPARTMENT;
}

/** Sucursal principal de La Paz — punto de partida del selector de ubicación. */
export const LOCAL_CENTER = { lat: -16.52362570871352, lng: -68.11237658813462 } as const;
