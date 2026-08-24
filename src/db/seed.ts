import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { brands, categories, products } from "./schema";

const TREE: Record<string, string[]> = {
  Guantes: ["Competición", "Entrenamiento", "Junior"],
  Poleras: ["Arquero", "Uniformes DREI", "Calzas"],
  Botas: ["Césped firme", "Futsal"],
  Pelotas: ["N°4", "N°5"],
  Canilleras: ["Con tobillera", "Placa simple"],
};

const BRANDS: [string, string | null][] = [
  ["Buffon", null], ["Uhlsport", null], ["HO Soccer", null],
  ["Elite", null], ["GXP", null], ["DREI", "#1B3A5C"],
];

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function seedCatalog() {
  for (const [name, hex] of BRANDS) {
    await db.insert(brands).values({ name, slug: slug(name), accentHex: hex }).onConflictDoNothing();
  }
  let pos = 0;
  for (const [parent, subs] of Object.entries(TREE)) {
    const parentSlug = slug(parent);
    const [inserted] = await db.insert(categories)
      .values({ name: parent, slug: parentSlug, position: pos++ })
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
   No son parte del seed de producción: son los del prototipo, para poder revisar
   la tienda antes de que el dueño cargue el catálogo real desde el admin.
   Van sin imagen — esas salen de Cloudinary y la tienda muestra el placeholder
   de marca mientras no haya ninguna. */

type DemoProduct = {
  name: string; brandName: string; category: string; sub: string;
  price: number; compareAt?: number; stock: number; sizes: string[];
  description: string; attributes: { name: string; value: string }[];
  featured?: boolean;
};

const DEMO: DemoProduct[] = [
  {
    name: "Buffon Ultimate Grip", brandName: "Buffon", category: "Guantes", sub: "Competición",
    price: 480, compareAt: 620, stock: 12, sizes: ["7", "8", "9", "10", "11"], featured: true,
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
    description: "Placa rígida con espuma interna y tobillera desmontable.",
    attributes: [
      { name: "Color", value: "Negro" },
      { name: "Tamaño", value: "15 cm / 18 cm" },
      { name: "Tobillera", value: "Desmontable" },
    ],
  },
];

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

    await db
      .insert(products)
      .values({
        name: p.name,
        slug: slug(p.name),
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
      .onConflictDoNothing();
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
    console.log(DEMO.length + " productos de demostración cargados.");
  } else {
    console.log("(agregá --demo para cargar productos de prueba)");
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
