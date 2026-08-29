import "../lib/load-env";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { brands, categories, productImages, products } from "./schema";

const TREE: Record<string, string[]> = {
  Guantes: ["Competición", "Entrenamiento", "Junior"],
  Poleras: ["Arquero", "Uniformes DREI", "Calzas"],
  Botas: ["Césped firme", "Futsal"],
  Pelotas: ["N°4", "N°5"],
  Canilleras: ["Con tobillera", "Placa simple"],
};

const CATEGORY_IMAGES: Record<string, string> = {
  guantes: "/demo-products/guantes.png",
  poleras: "/demo-products/poleras.png",
  botas: "/demo-products/botas.png",
  pelotas: "/demo-products/pelotas.png",
  canilleras: "/demo-products/canilleras.png",
};

const BRANDS: [string, string | null][] = [
  ["Buffon", null], ["Uhlsport", null], ["HO Soccer", null],
  ["Elite", null], ["GXP", null], ["DREI", "#1B3A5C"],
];

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function seedCatalog() {
  for (let brandPosition = 0; brandPosition < BRANDS.length; brandPosition++) {
    const [name, hex] = BRANDS[brandPosition]!;
    await db.insert(brands).values({ name, slug: slug(name), accentHex: hex, isOwnBrand: name === "DREI", position: brandPosition }).onConflictDoNothing();
  }
  let pos = 0;
  for (const [parent, subs] of Object.entries(TREE)) {
    const parentSlug = slug(parent);
    const [inserted] = await db.insert(categories)
      .values({ name: parent, slug: parentSlug, position: pos++, imagePath: CATEGORY_IMAGES[parentSlug] ?? null })
      .onConflictDoNothing().returning();

    // Si la categoría ya existía, `returning()` viene vacío: la buscamos igual para
    // no saltarnos sus subcategorías al re-ejecutar el seed.
    const row = inserted ?? (await db.query.categories.findFirst({
      where: eq(categories.slug, parentSlug),
    }));
    if (!row) continue;

    let sp = 0;
    for (const sub of subs) {
      await db.insert(categories).values({
        name: sub, slug: slug(parent + "-" + sub), parentId: row.id, position: sp++,
      }).onConflictDoNothing();
    }
  }
}

/**
 * `orders.number` es el correlativo visible (#1041), independiente del id.
 * Una secuencia de Postgres lo resuelve sin condiciones de carrera.
 */
export async function ensureOrderNumberSequence() {
  await db.execute(
    sql`CREATE SEQUENCE IF NOT EXISTS orders_number_seq START WITH 1041 INCREMENT BY 1`,
  );
  // Si ya hay pedidos cargados, la secuencia arranca después del último.
  await db.execute(sql`
    SELECT setval('orders_number_seq',
      GREATEST((SELECT COALESCE(MAX(number), 1040) FROM orders), 1040), true)
  `);
}

/* Productos de demostración (opcional, con --demo).
   No son parte del seed de producción: son los del prototipo original, para
   armar una demo completa y mostrarle al cliente cómo se ve la tienda ya
   "terminada" antes de cerrar el trato. Las fotos son de stock (LoremFlickr,
   con `lock` para que la imagen quede fija y no cambie en cada visita) — un
   parche temporal a propósito. Cuando el catálogo real suba sus propias fotos
   a ImageKit, esta demo se reemplaza entera: no hay que tocar la lógica de catálogo. */

type DemoProduct = {
  name: string; brandName: string; category: string; sub: string;
  price: number; compareAt?: number; stock: number; sizes: string[];
  description: string; attributes: { name: string; value: string }[];
  featured?: boolean;
  /** Keyword y semilla de LoremFlickr: mismo par de la referencia de diseño. */
  imageKeyword: string; imageLock: number;
};

const DEMO_CATEGORY_IMAGE: Record<string, string> = {
  Guantes: "/demo-products/guantes.png",
  Poleras: "/demo-products/poleras.png",
  Botas: "/demo-products/botas.png",
  Pelotas: "/demo-products/pelotas.png",
  Canilleras: "/demo-products/canilleras.png",
};

const DEMO: DemoProduct[] = [
  {
    name: "Buffon Ultimate Grip", brandName: "Buffon", category: "Guantes", sub: "Competición",
    price: 480, compareAt: 620, stock: 12, sizes: ["7", "8", "9", "10", "11"], featured: true,
    imageKeyword: "goalkeeper,gloves", imageLock: 11,
    description:
      "Látex alemán de 4 mm, corte negativo y cierre de muñeca elástico. Para arqueros que juegan en cancha dura y no perdonan un rebote.",
    attributes: [
      { name: "Color", value: "Negro con líneas naranjas" },
      { name: "Corte", value: "Negativo" },
      { name: "Látex palma", value: "4 mm alemán" },
      { name: "Cierre", value: "Muñeca elástica 8 cm" },
    ],
  },
  {
    name: "Uhlsport Speed Contact", brandName: "Uhlsport", category: "Guantes", sub: "Competición",
    price: 520, stock: 7, sizes: ["7", "8", "9", "10", "11"],
    imageKeyword: "goalkeeper,glove", imageLock: 21,
    description:
      "Diseñado para reacción rápida en distancias cortas. Palma con agarre en seco y húmedo, dorso ventilado.",
    attributes: [
      { name: "Color", value: "Blanco con detalles flúor" },
      { name: "Corte", value: "Roll finger" },
      { name: "Látex palma", value: "3.5 mm" },
      { name: "Uso", value: "Césped sintético" },
    ],
  },
  {
    name: "HO Soccer Ssyncro Pro", brandName: "HO Soccer", category: "Guantes", sub: "Competición",
    price: 610, compareAt: 750, stock: 3, sizes: ["8", "9", "10", "11"], featured: true,
    imageKeyword: "soccer,goalkeeper", imageLock: 31,
    description:
      "Modelo de competición con protección de falange y palma de contacto total. El más pedido de la temporada.",
    attributes: [
      { name: "Color", value: "Negro mate con rojo" },
      { name: "Corte", value: "Híbrido" },
      { name: "Látex palma", value: "4 mm Contact" },
      { name: "Protección", value: "Falange removible" },
    ],
  },
  {
    name: "Elite Neo Revolution", brandName: "Elite", category: "Guantes", sub: "Entrenamiento",
    price: 390, stock: 18, sizes: ["7", "8", "9", "10"],
    imageKeyword: "gloves,sport", imageLock: 41,
    description: "Entrada de gama profesional. Buen agarre, precio de entrenamiento diario.",
    attributes: [
      { name: "Color", value: "Verde flúor" },
      { name: "Corte", value: "Plano" },
      { name: "Látex palma", value: "3 mm" },
      { name: "Uso", value: "Entrenamiento" },
    ],
  },
  {
    name: "GXP Pro Latex", brandName: "GXP", category: "Guantes", sub: "Entrenamiento",
    price: 350, compareAt: 420, stock: 22, sizes: ["8", "9", "10", "11"],
    imageKeyword: "goalie,gloves", imageLock: 51,
    description: "Guante de trabajo diario, resistente a cancha de arena y polvo.",
    attributes: [
      { name: "Color", value: "Negro con gris" },
      { name: "Corte", value: "Plano" },
      { name: "Látex palma", value: "3 mm" },
      { name: "Uso", value: "Cancha de arena" },
    ],
  },
  {
    name: "Buffon Training Grip", brandName: "Buffon", category: "Guantes", sub: "Entrenamiento",
    price: 300, stock: 15, sizes: ["7", "8", "9", "10"],
    imageKeyword: "gloves,goalkeeper", imageLock: 111,
    description: "Versión de entrenamiento del modelo Ultimate, misma horma con látex más duro.",
    attributes: [
      { name: "Color", value: "Gris con naranja" },
      { name: "Corte", value: "Plano" },
      { name: "Látex palma", value: "3 mm duro" },
      { name: "Uso", value: "Entrenamiento" },
    ],
  },
  {
    name: "DREI Camiseta Arquero Pro", brandName: "DREI", category: "Poleras", sub: "Arquero",
    price: 280, stock: 30, sizes: ["S", "M", "L", "XL", "XXL"], featured: true,
    imageKeyword: "goalkeeper,jersey", imageLock: 61,
    description:
      "Tela deportiva con codos acolchados y corte holgado. Sublimación full, personalizable con nombre y número.",
    attributes: [
      { name: "Color", value: "Negro con líneas naranjas" },
      { name: "Tela", value: "Micro poliéster 150 g" },
      { name: "Personalización", value: "Nombre y número" },
    ],
  },
  {
    name: "DREI Uniforme Personalizado", brandName: "DREI", category: "Poleras", sub: "Uniformes DREI",
    price: 340, compareAt: 420, stock: 9, sizes: ["S", "M", "L", "XL", "XXL"],
    imageKeyword: "football,kit", imageLock: 71,
    description: "Set completo para equipo: camiseta, short y medias. Diseño propio, mínimo 12 unidades.",
    attributes: [
      { name: "Color", value: "A definir con el cliente" },
      { name: "Incluye", value: "Camiseta + short + medias" },
      { name: "Mínimo", value: "12 unidades" },
    ],
  },
  {
    name: "DREI Calza Térmica", brandName: "DREI", category: "Poleras", sub: "Calzas",
    price: 160, stock: 24, sizes: ["S", "M", "L", "XL"],
    imageKeyword: "sports,leggings", imageLock: 121,
    description: "Calza larga con protección de cadera y rodilla para arqueros.",
    attributes: [
      { name: "Color", value: "Negro" },
      { name: "Protección", value: "Cadera + rodilla" },
      { name: "Tela", value: "Lycra 240 g" },
    ],
  },
  {
    name: "Vortex FG Botín Cancha", brandName: "GXP", category: "Botas", sub: "Césped firme",
    price: 690, stock: 5, sizes: ["38", "39", "40", "41", "42", "43", "44"],
    imageKeyword: "football,boots", imageLock: 81,
    description: "Tapón firme, capellada sintética liviana con banda de golpeo texturizada.",
    attributes: [
      { name: "Color", value: "Naranja con negro" },
      { name: "Tapón", value: "FG · césped firme" },
      { name: "Peso", value: "215 g" },
    ],
  },
  {
    name: "Match Pro Pelota N°5", brandName: "GXP", category: "Pelotas", sub: "N°5",
    price: 250, compareAt: 310, stock: 26, sizes: ["N°5"], featured: true,
    imageKeyword: "soccer,ball", imageLock: 91,
    description: "Pelota cosida a máquina, cámara de látex, vuelo estable para partido oficial.",
    attributes: [
      { name: "Color", value: "Blanco con líneas negras" },
      { name: "Tamaño", value: "N°5 · 68-70 cm" },
      { name: "Cámara", value: "Látex" },
      { name: "Uso", value: "Partido" },
    ],
  },
  {
    name: "Impact Canilleras", brandName: "Elite", category: "Canilleras", sub: "Con tobillera",
    price: 120, stock: 40, sizes: ["S", "M", "L"],
    imageKeyword: "shin,guard,soccer", imageLock: 101,
    description: "Placa rígida con espuma interna y tobillera desmontable.",
    attributes: [
      { name: "Color", value: "Negro" },
      { name: "Tamaño", value: "15 cm / 18 cm" },
      { name: "Tobillera", value: "Desmontable" },
    ],
  },
];

type ExtraDemoSpec = Omit<
  DemoProduct,
  "description" | "attributes" | "imageLock"
>;

const EXTRA_DEMO: ExtraDemoSpec[] = [
  // Guantes: 6 originales + 4 nuevos = 10.
  { name: "Buffon Junior Shield", brandName: "Buffon", category: "Guantes", sub: "Junior", price: 220, stock: 20, sizes: ["4", "5", "6", "7"], imageKeyword: "goalkeeper,gloves,kids" },
  { name: "Elite Kids Grip", brandName: "Elite", category: "Guantes", sub: "Junior", price: 195, stock: 16, sizes: ["4", "5", "6"], imageKeyword: "soccer,gloves,junior" },
  { name: "HO Soccer One Negative", brandName: "HO Soccer", category: "Guantes", sub: "Competición", price: 560, compareAt: 640, stock: 8, sizes: ["7", "8", "9", "10"], imageKeyword: "goalkeeper,glove" },
  { name: "GXP Junior Starter", brandName: "GXP", category: "Guantes", sub: "Junior", price: 180, stock: 25, sizes: ["4", "5", "6", "7"], imageKeyword: "goalie,gloves,kids" },

  // Poleras: 3 originales + 7 nuevos = 10.
  { name: "DREI Camiseta Arquero Classic", brandName: "DREI", category: "Poleras", sub: "Arquero", price: 240, stock: 22, sizes: ["S", "M", "L", "XL"], imageKeyword: "goalkeeper,jersey" },
  { name: "DREI Camiseta Match Fluor", brandName: "DREI", category: "Poleras", sub: "Arquero", price: 295, stock: 18, sizes: ["S", "M", "L", "XL", "XXL"], imageKeyword: "football,goalkeeper,shirt" },
  { name: "DREI Uniforme Team Black", brandName: "DREI", category: "Poleras", sub: "Uniformes DREI", price: 360, stock: 14, sizes: ["S", "M", "L", "XL"], imageKeyword: "football,team,kit" },
  { name: "DREI Uniforme Team Blue", brandName: "DREI", category: "Poleras", sub: "Uniformes DREI", price: 360, stock: 12, sizes: ["S", "M", "L", "XL"], imageKeyword: "soccer,uniform,blue" },
  { name: "DREI Calza Corta Protection", brandName: "DREI", category: "Poleras", sub: "Calzas", price: 145, stock: 28, sizes: ["S", "M", "L", "XL"], imageKeyword: "sports,compression,shorts" },
  { name: "DREI Calza Pro Acolchada", brandName: "DREI", category: "Poleras", sub: "Calzas", price: 210, compareAt: 250, stock: 17, sizes: ["S", "M", "L", "XL"], imageKeyword: "goalkeeper,padded,leggings" },
  { name: "DREI Polera Entrenamiento Dry", brandName: "DREI", category: "Poleras", sub: "Arquero", price: 190, stock: 32, sizes: ["S", "M", "L", "XL", "XXL"], imageKeyword: "sports,training,shirt" },

  // Botas: 1 original + 9 nuevas = 10.
  { name: "GXP Velocity FG", brandName: "GXP", category: "Botas", sub: "Césped firme", price: 620, stock: 9, sizes: ["38", "39", "40", "41", "42", "43"], imageKeyword: "football,boots" },
  { name: "Elite Control Pro FG", brandName: "Elite", category: "Botas", sub: "Césped firme", price: 740, compareAt: 820, stock: 6, sizes: ["39", "40", "41", "42", "43"], imageKeyword: "soccer,cleats" },
  { name: "Uhlsport Attack FG", brandName: "Uhlsport", category: "Botas", sub: "Césped firme", price: 680, stock: 8, sizes: ["38", "39", "40", "41", "42"], imageKeyword: "football,cleats" },
  { name: "Buffon Keeper Turf", brandName: "Buffon", category: "Botas", sub: "Futsal", price: 420, stock: 15, sizes: ["37", "38", "39", "40", "41", "42"], imageKeyword: "indoor,soccer,shoes" },
  { name: "GXP Sala Control", brandName: "GXP", category: "Botas", sub: "Futsal", price: 390, stock: 20, sizes: ["38", "39", "40", "41", "42", "43"], imageKeyword: "futsal,shoes" },
  { name: "Elite Indoor Speed", brandName: "Elite", category: "Botas", sub: "Futsal", price: 460, stock: 11, sizes: ["39", "40", "41", "42", "43"], imageKeyword: "indoor,football,shoes" },
  { name: "HO Soccer Keeper FG", brandName: "HO Soccer", category: "Botas", sub: "Césped firme", price: 710, stock: 7, sizes: ["39", "40", "41", "42", "43", "44"], imageKeyword: "soccer,boots,grass" },
  { name: "GXP Junior Futsal", brandName: "GXP", category: "Botas", sub: "Futsal", price: 280, stock: 24, sizes: ["32", "33", "34", "35", "36", "37"], imageKeyword: "kids,futsal,shoes" },
  { name: "Elite Junior FG", brandName: "Elite", category: "Botas", sub: "Césped firme", price: 330, stock: 19, sizes: ["33", "34", "35", "36", "37", "38"], imageKeyword: "kids,football,boots" },

  // Pelotas: 1 original + 9 nuevas = 10.
  { name: "GXP Training Pelota N°5", brandName: "GXP", category: "Pelotas", sub: "N°5", price: 180, stock: 35, sizes: ["N°5"], imageKeyword: "soccer,ball" },
  { name: "Elite Match Thermo N°5", brandName: "Elite", category: "Pelotas", sub: "N°5", price: 320, compareAt: 380, stock: 18, sizes: ["N°5"], imageKeyword: "football,match,ball" },
  { name: "Uhlsport Pro Match N°5", brandName: "Uhlsport", category: "Pelotas", sub: "N°5", price: 350, stock: 13, sizes: ["N°5"], imageKeyword: "soccer,ball,stadium" },
  { name: "Buffon Training N°5", brandName: "Buffon", category: "Pelotas", sub: "N°5", price: 210, stock: 27, sizes: ["N°5"], imageKeyword: "football,training,ball" },
  { name: "GXP Futsal Pro N°4", brandName: "GXP", category: "Pelotas", sub: "N°4", price: 230, stock: 22, sizes: ["N°4"], imageKeyword: "futsal,ball" },
  { name: "Elite Sala Control N°4", brandName: "Elite", category: "Pelotas", sub: "N°4", price: 260, stock: 17, sizes: ["N°4"], imageKeyword: "indoor,soccer,ball" },
  { name: "HO Soccer Academy N°4", brandName: "HO Soccer", category: "Pelotas", sub: "N°4", price: 195, stock: 30, sizes: ["N°4"], imageKeyword: "soccer,academy,ball" },
  { name: "GXP Junior Soft N°4", brandName: "GXP", category: "Pelotas", sub: "N°4", price: 150, stock: 28, sizes: ["N°4"], imageKeyword: "kids,soccer,ball" },
  { name: "Elite Street Football", brandName: "Elite", category: "Pelotas", sub: "N°5", price: 170, stock: 21, sizes: ["N°5"], imageKeyword: "street,football,ball" },

  // Canilleras: 1 original + 9 nuevas = 10.
  { name: "GXP Shield Tobillera", brandName: "GXP", category: "Canilleras", sub: "Con tobillera", price: 110, stock: 34, sizes: ["S", "M", "L"], imageKeyword: "soccer,shin,guards" },
  { name: "Elite Guard Pro", brandName: "Elite", category: "Canilleras", sub: "Placa simple", price: 145, stock: 26, sizes: ["S", "M", "L"], imageKeyword: "football,shin,guard" },
  { name: "Uhlsport Carbon Shield", brandName: "Uhlsport", category: "Canilleras", sub: "Placa simple", price: 190, compareAt: 230, stock: 14, sizes: ["M", "L"], imageKeyword: "soccer,protection,guard" },
  { name: "Buffon Junior Guard", brandName: "Buffon", category: "Canilleras", sub: "Con tobillera", price: 95, stock: 40, sizes: ["XS", "S", "M"], imageKeyword: "kids,shin,guards" },
  { name: "GXP Flex Plate", brandName: "GXP", category: "Canilleras", sub: "Placa simple", price: 100, stock: 32, sizes: ["S", "M", "L"], imageKeyword: "football,shin,pads" },
  { name: "Elite Ankle Protect", brandName: "Elite", category: "Canilleras", sub: "Con tobillera", price: 135, stock: 23, sizes: ["S", "M", "L"], imageKeyword: "soccer,ankle,guard" },
  { name: "HO Soccer Light Guard", brandName: "HO Soccer", category: "Canilleras", sub: "Placa simple", price: 125, stock: 29, sizes: ["S", "M", "L"], imageKeyword: "soccer,shin,protection" },
  { name: "GXP Mini Shield", brandName: "GXP", category: "Canilleras", sub: "Placa simple", price: 85, stock: 45, sizes: ["XS", "S"], imageKeyword: "junior,shin,guards" },
  { name: "Elite Match Ankle", brandName: "Elite", category: "Canilleras", sub: "Con tobillera", price: 155, stock: 18, sizes: ["S", "M", "L"], imageKeyword: "football,guard,ankle" },
];

DEMO.push(
  ...EXTRA_DEMO.map((product, index): DemoProduct => ({
    ...product,
    imageLock: 200 + index * 3,
    description: `${product.name}, diseñado para rendir con comodidad y resistencia en cada partido y entrenamiento.`,
    attributes: [
      { name: "Marca", value: product.brandName },
      { name: "Línea", value: product.sub },
      { name: "Uso", value: "Entrenamiento y competición" },
    ],
  })),
);

export async function seedDemoProducts() {
  const allCats = await db.select().from(categories);
  const allBrands = await db.select().from(brands);
  const bySlug = new Map(allCats.map((c) => [c.slug, c]));
  const brandByName = new Map(allBrands.map((b) => [b.name, b]));

  for (const p of DEMO) {
    const cat = bySlug.get(slug(p.category));
    const sub = bySlug.get(slug(p.category + "-" + p.sub));
    const brand = brandByName.get(p.brandName);
    if (!cat) continue;

    const productSlug = slug(p.name);

    // insert-o-busca: si ya corriste --demo antes, el producto existe y solo
    // hay que asegurarse de que sus fotos estén (por eso no alcanza con
    // onConflictDoNothing solo: re-ejecutar el seed nunca les agregaba imagen).
    const [inserted] = await db
      .insert(products)
      .values({
        name: p.name,
        slug: productSlug,
        description: p.description,
        categoryId: cat.id,
        subcategoryId: sub?.id ?? null,
        brandId: brand?.id ?? null,
        price: p.price.toFixed(2),
        compareAtPrice: p.compareAt ? p.compareAt.toFixed(2) : null,
        stock: p.stock,
        sizes: p.sizes,
        attributes: p.attributes,
        published: true,
        featured: p.featured ?? false,
      })
      .onConflictDoNothing()
      .returning({ id: products.id });

    const productId =
      inserted?.id ??
      (await db.query.products.findFirst({ where: eq(products.slug, productSlug) }))?.id;
    if (!productId) continue;

    // Una foto controlada y coherente con la categoría, reemplazando las imágenes
    // aleatorias antiguas si el seed ya se ejecutó antes.
    await db.delete(productImages).where(eq(productImages.productId, productId));
    await db.insert(productImages).values({
      productId,
      publicId: DEMO_CATEGORY_IMAGE[p.category] ?? "/demo-products/guantes.png",
      alt: p.name,
      position: 0,
      isPrimary: true,
    });
  }
}

/* runner */

async function main() {
  const demo = process.argv.includes("--demo");
  await seedCatalog();
  await ensureOrderNumberSequence();
  console.log("Categorías, subcategorías y marcas listas.");
  if (demo) {
    await seedDemoProducts();
    console.log(DEMO.length + " productos de demostración cargados, con imágenes coherentes por categoría.");
  } else {
    console.log("(agrega --demo para cargar productos de prueba)");
  }
}

// Solo corre al ejecutar el archivo directamente, no al importarlo.
if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
