import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no está configurada.");
const client = postgres(url, { max: 1, connect_timeout: 10, prepare: false });

async function status(tx) {
  const rows = await tx`SELECT slug, parent_id FROM categories WHERE slug IN ('nuevos', 'ofertas')`;
  // Una subcategoría con ese slug impediría crear la categoría del sistema.
  if (rows.some((row) => row.parent_id !== null)) {
    throw new Error("Existe una subcategoría con el slug nuevos u ofertas. Revisar antes de desplegar.");
  }
  return rows.length === 2 ? "ready" : "pending";
}

try {
  if (process.argv.includes("--check")) {
    console.log(await status(client));
  } else {
    await client.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(692101022)`;
      if (await status(tx) === "ready") return;
      await tx.unsafe(await readFile(new URL("./ensure-system-categories.sql", import.meta.url), "utf8"));
      if (await status(tx) !== "ready") throw new Error("La verificación de Nuevos y Ofertas no pasó.");
    });
    console.log("Categorías Nuevos y Ofertas preparadas y verificadas.");
  }
} finally {
  await client.end();
}
