import { z } from "zod";
import { DEPARTMENTS, LOCAL_DEPARTMENT } from "./site";

/**
 * Reglas compartidas por el formulario y por el route handler. El cliente valida
 * para dar feedback; el server vuelve a validar porque es el único que manda.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const phoneSchema = trimmed(30)
  .min(7, "Falta el teléfono.")
  .regex(/^[+0-9()\s-]+$/, "Solo números, espacios y +.")
  .refine((v) => v.replace(/\D/g, "").length >= 7, "El número parece incompleto.");

export const shippingSchema = z
  .object({
    name: trimmed(120).min(2, "Escribe tu nombre."),
    phone: phoneSchema,
    note: trimmed(500).optional().default(""),
    mode: z.enum(["pickup", "delivery"], {
      errorMap: () => ({ message: "Elige retiro en local o entrega." }),
    }),
    department: z.enum(DEPARTMENTS).nullable().default(null),
    address: trimmed(240).optional().default(""),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    mapsUrl: trimmed(500).optional().default(""),
    documentId: trimmed(40).optional().default(""),
    email: z.union([z.literal(""), z.string().trim().email("Correo inválido.").max(160)])
      .optional()
      .default(""),
  })
  .superRefine((v, ctx) => {
    if (!v.department) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["department"], message: "Elige el departamento." });
      return;
    }

    if (v.department === LOCAL_DEPARTMENT) {
      if (v.mode === "pickup") return;
      // Cochabamba: logística propia, hace falta dirección y punto exacto.
      if (v.address.trim().length < 5) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Escribe la dirección." });
      }
      if (v.lat === null || v.lng === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lat"],
          message: "Marca la ubicación en el mapa.",
        });
      }
    } else {
      if (v.mode !== "delivery") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mode"],
          message: "El retiro en local solo está disponible en La Paz.",
        });
      }
      // En otro departamento el comprador solo deja sus datos. La empresa y la
      // sucursal de transporte las coordina posteriormente el vendedor.
      if (v.documentId.trim().length < 4) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documentId"], message: "Falta el CI o documento." });
      }
      if (!v.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Falta el correo." });
      }
    }
  });

export type ShippingInput = z.input<typeof shippingSchema>;
export type ShippingOutput = z.output<typeof shippingSchema>;

/** El cliente manda qué compra, nunca a qué precio: el precio lo pone el server. */
export const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  size: z.string().trim().max(40).nullable().default(null),
  quantity: z.number().int().min(1).max(99),
});

export const createOrderSchema = z.object({
  shipping: shippingSchema,
  items: z.array(orderItemSchema).min(1, "El carrito está vacío.").max(50),
  discountCode: trimmed(40).optional().default(""),
});

export const updateOrderSchema = createOrderSchema.extend({
  orderId: z.number().int().positive(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["recibido", "en_proceso", "completado", "cancelado"]),
});

export const paymentIntentSchema = z.object({
  orderId: z.number().int().positive(),
  method: z.enum(["qr", "card"]),
});

/** Extrae coordenadas de un link de Google Maps pegado por el cliente. */
export function parseMapsUrl(raw: string): { lat: number; lng: number } | null {
  const url = raw.trim();
  if (!url) return null;

  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, //  /maps/@-17.39,-66.15,17z
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, //  data=!3d...!4d...
    /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, //  ?q=lat,lng
    /[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/, //  pegado a mano
  ];

  for (const re of patterns) {
    const m = url.match(re);
    if (!m || !m[1] || !m[2]) continue;
    const lat = Number.parseFloat(m[1]);
    const lng = Number.parseFloat(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Falta el usuario.").max(60),
  password: z.string().min(1, "Falta la contraseña.").max(200),
});

const attributeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  // El slug (la URL /p/...) lo arma el server a partir del nombre: nunca lo
  // manda el cliente. Así no hay campo que el dueño tenga que entender, y
  // editar el nombre de un producto no le cambia la URL ya publicada.
  description: z.string().trim().max(4000).default(""),
  categoryId: z.number().int().positive(),
  subcategoryId: z.number().int().positive().nullable().default(null),
  brandId: z.number().int().positive().nullable().default(null),
  price: z.number().nonnegative().max(1_000_000),
  compareAtPrice: z.number().nonnegative().max(1_000_000).nullable().default(null),
  stock: z.number().int().min(0).max(100_000),
  sizes: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
  attributes: z.array(attributeSchema).max(40).default([]),
  images: z
    .array(z.object({
      publicId: z.string().trim().min(1).max(500),
      fileId: z.string().trim().min(1).max(200).nullable().default(null),
      alt: z.string().trim().max(200).default(""),
    }))
    .max(12)
    .default([]),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  parentId: z.number().int().positive().nullable().default(null),
  active: z.boolean().default(true),
  imagePath: z.string().trim().min(1).max(500).nullable().default(null),
  imageFileId: z.string().trim().min(1).max(200).nullable().default(null),
  // Ni slug ni position vienen del cliente: el slug sale del nombre y el orden
  // se decide arrastrando la fila (ver reorderCategoriesSchema).
});

export const reorderCategoriesSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1).max(200),
});

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(80),
  active: z.boolean().default(true),
  isOwnBrand: z.boolean().default(false),
  accentHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Usa un color hexadecimal válido.").nullable().default(null),
});

export const reorderBrandsSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1).max(200),
});

export const campaignSchema = z.object({
  enabled: z.boolean(),
  messages: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
});

export const checkoutSettingsSchema = z.object({
  shippingPrice: z.number().min(0).max(10_000),
  discounts: z.array(z.object({
    code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive().max(1_000_000),
    active: z.boolean(),
  })).max(100).superRefine((codes, ctx) => {
    const seen = new Set<string>();
    codes.forEach((item, index) => {
      if (item.type === "percent" && item.value > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "value"], message: "El porcentaje no puede superar 100." });
      }
      if (seen.has(item.code)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "code"], message: "El código está repetido." });
      }
      seen.add(item.code);
    });
  }),
});

export const uploadSignatureSchema = z.object({
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9-]+$/),
});
