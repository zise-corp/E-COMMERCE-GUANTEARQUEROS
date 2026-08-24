import { db } from "./index";
import { categories, brands } from "./schema";

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

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function seedCatalog() {
  for (const [name, hex] of BRANDS) {
    await db.insert(brands).values({ name, slug: slug(name), accentHex: hex }).onConflictDoNothing();
  }
  let pos = 0;
  for (const [parent, subs] of Object.entries(TREE)) {
    const [row] = await db.insert(categories)
      .values({ name: parent, slug: slug(parent), position: pos++ })
      .onConflictDoNothing().returning();
    if (!row) continue;
    let sp = 0;
    for (const sub of subs) {
      await db.insert(categories).values({
        name: sub, slug: slug(parent + "-" + sub), parentId: row.id, position: sp++,
      }).onConflictDoNothing();
    }
  }
}
