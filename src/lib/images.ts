/**
 * URLs de Cloudinary. En la base solo se guarda el `public_id`; los tamaños se
 * derivan con transformaciones, así una sola subida sirve para toda la tienda.
 *
 * Este módulo es seguro en el cliente: solo usa el cloud name público.
 */

const CLOUD =
  process.env["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"] ??
  process.env["CLOUDINARY_CLOUD_NAME"] ??
  "dvbtbadg1";

export const CLOUDINARY_FOLDER = "guantearqueros/productos";

export const IMAGE_PRESETS = {
  /** Grilla de listado, 4:3. */
  grid: "f_auto,q_auto,c_fill,w_600,h_450",
  /** Card cuadrada (destacados de la home). */
  square: "f_auto,q_auto,c_fill,w_600,h_600",
  /** Ficha de producto. */
  detail: "f_auto,q_auto,c_fill,w_1200,h_1200",
  /** Miniatura de admin, carrito y detalle de pedido. */
  thumb: "f_auto,q_auto,c_fill,w_120,h_120",
  /** Card de categoría, vertical. */
  category: "f_auto,q_auto,c_fill,w_600,h_800",
  /** Imagen social. */
  og: "f_auto,q_auto,c_fill,w_1200,h_630",
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

export function cloudinaryUrl(publicId: string, preset: ImagePreset = "grid"): string {
  // DEMO temporal: mientras no hay fotos reales subidas, algunas filas de
  // product_images guardan una URL externa completa en vez de un public_id de
  // Cloudinary (ver seedDemoProducts). Esa URL se usa tal cual, sin pasarla por
  // la transformación de Cloudinary porque no aplica a un host ajeno. Cuando el
  // catálogo real reemplace estas filas, este branch deja de activarse solo.
  if (/^https?:\/\//.test(publicId)) return publicId;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${IMAGE_PRESETS[preset]}/${publicId}`;
}

/**
 * DEMO temporal: foto de stock determinística (mismo `lock` = misma imagen
 * siempre, nunca cambia entre visitas). La usan el seed de productos y los
 * huecos decorativos de la home (hero, cards de categoría, bloque DREI)
 * mientras el catálogo no tiene fotos reales en Cloudinary.
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
} as const;
