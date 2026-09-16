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
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL ?? "https://zise.lat",
  /** Solo dígitos, formato internacional: se usa en el link de wa.me. */
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "59161235265",
  dreiWhatsapp: process.env.NEXT_PUBLIC_DREI_WHATSAPP ?? "59162507981",
  social: {
    facebook: "https://www.facebook.com/guantearqueros.bolivia",
    instagram: "https://www.instagram.com/guantearquerosbolivia_oficial",
    tiktok: "https://www.tiktok.com/@guantearqueros.bo",
    dreiFacebook: "https://www.facebook.com/profile.php?id=61552525021314",
    dreiInstagram: "https://www.instagram.com/drei_bolivia_",
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

export function whatsappLink(message: string, digits: string = site.supportWhatsapp): string {
  return `https://wa.me/${digits.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
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

/** Datos oficiales compartidos por la portada, el checkout y la confirmación. */
export const STORE_LOCATIONS = [
  {
    city: "La Paz",
    short: "Obrajes",
    address: "Zona Obrajes, Av. Hernando Siles esquina Calle 2, La Paz, Bolivia, 0000",
    mapsUrl: "https://maps.app.goo.gl/Hu5t8XERXMiwThEH7",
    lat: -16.52362570871352,
    lng: -68.11237658813462,
  },
  {
    city: "Santa Cruz",
    short: "Centro",
    address: "Calle Charcas Nro. 47, entre Beni y 24 de Septiembre, a unos pasos de la iglesia San Andrés",
    mapsUrl: "https://maps.app.goo.gl/VtHg9SzfLhiiHU1TA",
    lat: -17.780480182374156,
    lng: -63.181217623983784,
  },
  {
    city: "Cochabamba",
    short: "La Torre San Juan",
    address: "Calle Ladislao Cabrera, entre 25 de Mayo y San Martín, Edif. La Torre San Juan, local 106",
    mapsUrl: "https://maps.app.goo.gl/9RiRFU5B8YNcfCVC9",
    lat: -17.396951012145156,
    lng: -66.1539796356822,
  },
] as const satisfies readonly {
  city: Department;
  short: string;
  address: string;
  mapsUrl: string;
  lat: number;
  lng: number;
}[];

export type StoreCity = (typeof STORE_LOCATIONS)[number]["city"];

export function storeLocationFor(city: string | null | undefined) {
  return STORE_LOCATIONS.find((location) => location.city === city) ?? null;
}

/** Ciudades con sucursal: permiten retiro o entrega con ubicación exacta. */
export const LOCAL_DEPARTMENTS = STORE_LOCATIONS.map((location) => location.city) as StoreCity[];

/** Se conserva como sede principal para compatibilidad con datos anteriores. */
export const LOCAL_DEPARTMENT: Department = "La Paz";

export function isLocalDepartment(dept: string | null | undefined): boolean {
  return Boolean(dept && (LOCAL_DEPARTMENTS as readonly string[]).includes(dept));
}

/** Centros iniciales del mapa; el comprador siempre marca la ubicación exacta. */
export const LOCAL_CENTERS = Object.fromEntries(
  STORE_LOCATIONS.map(({ city, lat, lng }) => [city, { lat, lng }]),
) as Record<StoreCity, { lat: number; lng: number }>;

export const LOCAL_CENTER = LOCAL_CENTERS[LOCAL_DEPARTMENT];

export function localCenterFor(dept: string | null | undefined) {
  return isLocalDepartment(dept)
    ? LOCAL_CENTERS[dept as keyof typeof LOCAL_CENTERS]
    : LOCAL_CENTER;
}
