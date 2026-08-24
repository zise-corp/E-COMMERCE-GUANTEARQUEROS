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
