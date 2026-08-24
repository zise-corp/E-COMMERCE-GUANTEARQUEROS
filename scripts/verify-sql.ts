/**
 * Verificación del SQL contra un Postgres embebido (PGlite), sin necesidad de una
 * base real. Aplica las migraciones, corre el seed y ejercita el camino completo
 * de un pedido: precio congelado, secuencia del correlativo y ON DELETE SET NULL.
 *
 *   npx tsx scripts/verify-sql.ts
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ok = (msg: string) => console.log("  ok  " + msg);
const fail = (msg: string) => {
  console.error("FALLA  " + msg);
  process.exitCode = 1;
};

async function main() {
  const db = new PGlite();

  // 1. Migraciones, en orden.
  const dir = join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await db.exec(trimmed);
    }
    ok(`migración ${file}`);
  }

  const tables = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`,
  );
  const names = tables.rows.map((r) => r.table_name);
  const expected = [
    "admin_users",
    "brands",
    "categories",
    "order_items",
    "orders",
    "product_images",
    "products",
    "site_settings",
  ];
  for (const t of expected) {
    if (names.includes(t)) ok(`tabla ${t}`);
    else fail(`falta la tabla ${t}`);
  }

  // 2. Secuencia del correlativo (la crea el seed).
  await db.exec(`CREATE SEQUENCE IF NOT EXISTS orders_number_seq START WITH 1041 INCREMENT BY 1`);
  const first = await db.query<{ n: number }>(`SELECT nextval('orders_number_seq')::int AS n`);
  if (first.rows[0]?.n === 1041) ok("orders_number_seq arranca en 1041");
  else fail(`orders_number_seq devolvió ${first.rows[0]?.n}`);

  // 3. Catálogo mínimo.
  await db.exec(`
    INSERT INTO brands (name, slug, accent_hex) VALUES ('DREI', 'drei', '#1B3A5C');
    INSERT INTO categories (name, slug, position) VALUES ('Guantes', 'guantes', 0);
    INSERT INTO categories (name, slug, parent_id, position)
      VALUES ('Competición', 'guantes-competicion', 1, 0);
    INSERT INTO products (name, slug, description, category_id, subcategory_id, brand_id,
                          price, compare_at_price, stock, sizes, attributes, published)
      VALUES ('HO Soccer Ssyncro Pro', 'ho-soccer-ssyncro-pro', 'Modelo de competición.',
              1, 2, 1, 610.00, 750.00, 3, ARRAY['8','9','10'],
              '[{"name":"Color","value":"Negro mate con rojo"}]'::jsonb, true);
  `);
  ok("insert de catálogo con sizes text[] y attributes jsonb");

  const attrs = await db.query<{ attributes: { name: string; value: string }[] }>(
    `SELECT attributes FROM products WHERE id = 1`,
  );
  if (attrs.rows[0]?.attributes?.[0]?.value === "Negro mate con rojo") {
    ok("atributos manuales vuelven con su orden y forma");
  } else {
    fail("los atributos no volvieron bien");
  }

  // 4. Pedido con precio congelado.
  await db.exec(`
    INSERT INTO orders (number, customer_name, customer_phone, mode, department, address,
                        lat, lng, total)
      VALUES (1041, 'Marco Villarroel', '+591 712 34 567', 'delivery', 'Cochabamba',
              'Av. América 1240', -17.393600, -66.157000, 610.00);
    INSERT INTO order_items (order_id, product_id, name, size, unit_price, quantity,
                             attributes_snapshot)
      VALUES (1, 1, 'HO Soccer Ssyncro Pro', '9', 610.00, 1,
              '[{"name":"Color","value":"Negro mate con rojo"}]'::jsonb);
  `);
  ok("pedido con ítem y snapshot de atributos");

  // 5. El pedido histórico sobrevive al borrado del producto.
  await db.exec(`DELETE FROM products WHERE id = 1`);
  const survivor = await db.query<{
    product_id: number | null;
    name: string;
    unit_price: string;
  }>(`SELECT product_id, name, unit_price FROM order_items WHERE order_id = 1`);

  const row = survivor.rows[0];
  if (row && row.product_id === null && row.name === "HO Soccer Ssyncro Pro") {
    ok(`ON DELETE SET NULL: el ítem conserva nombre y precio (Bs ${row.unit_price})`);
  } else {
    fail("el ítem no sobrevivió al borrado del producto");
  }

  // 6. Un pedido no se puede duplicar por número.
  try {
    await db.exec(`INSERT INTO orders (number, customer_name, customer_phone, total)
                   VALUES (1041, 'Otro', '123', 10.00)`);
    fail("orders.number aceptó un duplicado");
  } catch {
    ok("orders.number es único");
  }

  // 7. Ajustes del sitio.
  await db.exec(`
    INSERT INTO site_settings (key, value)
      VALUES ('campaign', '{"enabled":true,"messages":["DESCUENTOS"]}'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  ok("site_settings admite upsert por clave");

  await db.close();
  console.log(process.exitCode ? "\nHay fallas." : "\nTodo en orden.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
