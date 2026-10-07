import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no está configurada.");
const client = postgres(url, { max: 1, connect_timeout: 10, prepare: false });

async function status(tx) {
  const [tables] = await tx`SELECT to_regclass('public.product_variants')::text AS variants, to_regclass('public.inventory_movements')::text AS movements`;
  if (!tables.variants && !tables.movements) return "pending";
  if (!tables.variants || !tables.movements) throw new Error("La migración de inventario está incompleta. Revisar antes de desplegar.");
  const mismatch = await tx`
    SELECT p.id FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
    GROUP BY p.id, p.stock
    HAVING count(v.id) = 0 OR coalesce(sum(v.stock), 0) <> p.stock
    LIMIT 1
  `;
  if (mismatch.length) throw new Error(`El stock por talla no coincide con el total del producto ${mismatch[0].id}. Revisar antes de desplegar.`);
  return "ready";
}

try {
  if (process.argv.includes("--check")) {
    console.log(await status(client));
  } else {
    await client.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(692101020)`;
      if (await status(tx) === "ready") return;
      const source = await readFile(new URL("../drizzle/0020_lean_havok.sql", import.meta.url), "utf8");
      for (const statement of source.split("--> statement-breakpoint")) {
        if (statement.trim()) await tx.unsafe(statement);
      }
      if (await status(tx) !== "ready") throw new Error("La comprobación de inventario no pasó después de migrar.");
    });
    console.log("Inventario por talla preparado y verificado.");
  }
} finally {
  await client.end();
}
