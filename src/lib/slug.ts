/**
 * Mismo criterio que el seed: minúsculas, sin acentos, guiones entre palabras.
 * Vive aparte porque lo usan el admin (cliente) y el seed (server).
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Rutas de primer nivel que pertenecen a la aplicación y no a categorías. */
export const RESERVED_CATEGORY_SLUGS = new Set([
  "admin",
  "api",
  "ayuda",
  "c",
  "checkout",
  "drei",
  "p",
  "login",
  "robots.txt",
  "sitemap.xml",
  "opengraph-image",
  "favicon.ico",
  "_next",
  "ofertas",
  "nuevos",
]);

/** Categorías virtuales administradas por el sistema, no por el catálogo manual. */
export const SYSTEM_CATEGORY_SLUGS = new Set(["ofertas", "nuevos"]);

export function isReservedCategorySlug(slug: string): boolean {
  return RESERVED_CATEGORY_SLUGS.has(slug.toLowerCase());
}
