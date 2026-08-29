/** URLs y transformaciones de ImageKit. Este módulo solo usa el endpoint público. */
const IMAGEKIT_ENDPOINT = (
  process.env["NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT"] ?? "https://ik.imagekit.io/zisebyte"
).replace(/\/$/, "");

export const IMAGEKIT_FOLDER = "/guantearqueros/productos";
const IMAGEKIT_ROOT = "/guantearqueros/";


export const IMAGE_PRESETS = {
  /** Grilla de listado, 4:3. */
  grid: "f-auto,q-auto,c-at_least,w-600,h-450",
  /** Card cuadrada (destacados de la home). */
  square: "f-auto,q-auto,c-at_least,w-600,h-600",
  /** Ficha de producto. */
  detail: "f-auto,q-auto,c-at_least,w-1200,h-1200",
  /** Miniatura de admin, carrito y detalle de pedido. */
  thumb: "f-auto,q-auto,c-at_least,w-120,h-120",
  /** Card de categoría, cuadrada. */
  category: "f-auto,q-auto,c-at_least,w-600,h-600",
  /** Banner horizontal del bloque DREI. */
  wide: "f-auto,q-auto,c-at_least,w-1600,h-900",
  /** Imagen social. */
  og: "f-auto,q-auto,c-maintain_ratio,w-1200,h-630",
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export function imageKitUrl(filePath: string, preset: ImagePreset = "grid"): string {
  if (/^https?:\/\//.test(filePath)) return filePath;
  // Los recursos locales de la demo deben seguir saliendo desde /public.
  if (filePath.startsWith("/") && !filePath.startsWith(IMAGEKIT_ROOT)) return filePath;
  const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${IMAGEKIT_ENDPOINT}/tr:${IMAGE_PRESETS[preset]}${path}`;
}

/**
 * DEMO temporal: foto de stock determinística (mismo `lock` = misma imagen
 * siempre, nunca cambia entre visitas). La usan el seed de productos y los
 * huecos decorativos de la home (hero, cards de categoría, bloque DREI)
 * mientras el catálogo todavía no tiene fotos reales.
 */
export function demoStockPhoto(keyword: string, lock: number): string {
  return `https://loremflickr.com/720/720/${keyword}/all?lock=${lock}`;
}

/** `sizes` explícito por contexto: evita que el browser baje la imagen más grande. */
export const IMAGE_SIZES = {
  grid: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px",
  square: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px",
  detail: "(max-width: 1024px) 100vw, 660px",
  thumb: "120px",
  category: "(max-width: 640px) 50vw, 260px",
  wide: "(max-width: 1024px) 100vw, 620px",
} as const;
