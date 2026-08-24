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
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://guantearquerosbolivia.com.bo",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "ventas@guantearquerosbolivia.com.bo",
  /** Solo dígitos, formato internacional: se usa en el link de wa.me. */
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "59170000000",
} as const;

/** Cómo se muestra el WhatsApp en pantalla: +591 700 00 000 */
export function displayWhatsapp(digits: string = site.supportWhatsapp): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("591")) {
    return `+591 ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
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

/** Cochabamba es la región con logística propia: pide dirección + ubicación exacta. */
export const LOCAL_DEPARTMENT: Department = "Cochabamba";

export function isLocalDepartment(dept: string | null | undefined): boolean {
  return dept === LOCAL_DEPARTMENT;
}

/** Centro de Cochabamba — punto de partida del selector de ubicación. */
export const LOCAL_CENTER = { lat: -17.3936, lng: -66.157 } as const;
