import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no está configurada.");
const client = postgres(url, { max: 1, connect_timeout: 10, prepare: false });

async function status(tx) {
  const [table] = await tx`SELECT to_regclass('public.product_extra_subcategories')::text AS name`;
  if (!table.name) return "pending";
  const [shape] = await tx`
    SELECT count(*)::int AS columns FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_extra_subcategories'
      AND column_name IN ('product_id', 'subcategory_id')
  `;
  const [indexes] = await tx`
    SELECT count(*)::int AS count FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'product_extra_subcategories'
      AND indexname IN ('product_extra_subcategories_product_subcategory_uq', 'product_extra_subcategories_subcategory_idx')
  `;
  const [foreignKeys] = await tx`
    SELECT count(*)::int AS count FROM pg_constraint
    WHERE conrelid = 'public.product_extra_subcategories'::regclass
      AND conname IN (
        'product_extra_subcategories_product_id_products_id_fk',
        'product_extra_subcategories_subcategory_id_categories_id_fk'
      )
  `;
  if (shape.columns !== 2 || indexes.count !== 2 || foreignKeys.count !== 2) {
    throw new Error("La tabla de subcategorías adicionales está incompleta. Revisar antes de desplegar.");
  }
  return "ready";
}

try {
  if (process.argv.includes("--check")) {
    console.log(await status(client));
  } else {
    await client.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(692101021)`;
      if (await status(tx) === "ready") return;
      const source = await readFile(new URL("../drizzle/0021_powerful_thunderbolts.sql", import.meta.url), "utf8");
      for (const statement of source.split("--> statement-breakpoint")) {
        if (statement.trim()) await tx.unsafe(statement);
      }
      if (await status(tx) !== "ready") throw new Error("La verificación de subcategorías adicionales no pasó.");
    });
    console.log("Subcategorías adicionales preparadas y verificadas.");
  }
} finally {
  await client.end();
}
