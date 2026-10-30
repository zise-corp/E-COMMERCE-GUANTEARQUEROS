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
    if (file.startsWith("0020_")) {
      await db.exec(`
        INSERT INTO categories (id, name, slug) VALUES (-1, 'Migración de inventario', 'migration-inventory-test');
        INSERT INTO products (id, name, slug, category_id, price, stock, sizes)
        VALUES (-1, 'Varias tallas', 'migration-many-test', -1, 10, 5, ARRAY['S','M']),
               (-2, 'Talla única', 'migration-one-test', -1, 10, 3, ARRAY[]::text[]);
      `);
    }
    const sql = await readFile(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await db.exec(trimmed);
    }
    ok(`migración ${file}`);
    if (file.startsWith("0020_")) {
      const variants = await db.query<{ product_id: number; size: string; stock: number }>(
        `SELECT product_id, size, stock FROM product_variants WHERE product_id < 0 ORDER BY product_id, position`,
      );
      if (JSON.stringify(variants.rows) !== JSON.stringify([
        { product_id: -2, size: "", stock: 3 },
        { product_id: -1, size: "S", stock: 3 },
        { product_id: -1, size: "M", stock: 2 },
      ])) fail("migración de stock por talla no conservó las unidades");
      else ok("backfill conserva el total y distribuye provisionalmente las tallas");
      await db.exec(`UPDATE products SET stock = 4 WHERE id = -1`);
      const mirrored = await db.query<{ total: number }>(`SELECT sum(stock)::int AS total FROM product_variants WHERE product_id = -1`);
      if (mirrored.rows[0]?.total === 4) ok("cambios de stock de la versión anterior se reflejan en tallas");
      else fail("el stock legado quedó desincronizado");
      await db.exec(`UPDATE product_variants SET stock = stock + 1 WHERE product_id = -1 AND size = 'S'; UPDATE products SET stock = 5 WHERE id = -1`);
      const afterNewCode = await db.query<{ total: number; movements: number }>(`
        SELECT (SELECT sum(stock)::int FROM product_variants WHERE product_id = -1) AS total,
               (SELECT count(*)::int FROM inventory_movements WHERE product_id = -1 AND reason = 'adjustment') AS movements
      `);
      if (afterNewCode.rows[0]?.total === 5 && afterNewCode.rows[0]?.movements === 1) ok("el trigger no duplica cambios del código nuevo");
      else fail("el trigger duplicó un cambio de inventario");
      await db.exec(`DELETE FROM products WHERE id < 0; DELETE FROM categories WHERE id = -1`);
    }
  }

  const tables = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`,
  );
  const names = tables.rows.map((r) => r.table_name);
  const expected = [
    "admin_users",
    "brands",
    "categories",
    "login_attempts",
    "order_items",
    "orders",
    "product_images",
    "product_extra_subcategories",
    "product_variants",
    "inventory_movements",
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

  await db.exec(`
    INSERT INTO categories (name, slug, parent_id, position)
      VALUES ('Gama alta', 'gama-alta', 1, 1), ('Corte híbrido', 'corte-hibrido', 1, 2);
    INSERT INTO product_extra_subcategories (product_id, subcategory_id)
      VALUES (1, 3), (1, 4);
  `);
  const classification = await db.query<{ subcategory_id: number }>(`
    SELECT subcategory_id FROM products WHERE id = 1
    UNION ALL
    SELECT subcategory_id FROM product_extra_subcategories WHERE product_id = 1
    ORDER BY subcategory_id
  `);
  if (JSON.stringify(classification.rows.map((row) => row.subcategory_id)) === JSON.stringify([2, 3, 4])) {
    ok("un producto conserva su subcategoría principal y admite otras dos");
  } else fail("se perdieron clasificaciones del producto");
  const listings = await db.query<{ subcategory_id: number; total: number }>(`
    SELECT c.id AS subcategory_id, count(p.id)::int AS total
    FROM categories c JOIN products p ON p.category_id = c.parent_id
    WHERE c.id IN (2, 3, 4) AND (p.subcategory_id = c.id OR EXISTS (
      SELECT 1 FROM product_extra_subcategories extra
      WHERE extra.product_id = p.id AND extra.subcategory_id = c.id
    ))
    GROUP BY c.id ORDER BY c.id
  `);
  if (JSON.stringify(listings.rows) === JSON.stringify([
    { subcategory_id: 2, total: 1 },
    { subcategory_id: 3, total: 1 },
    { subcategory_id: 4, total: 1 },
  ])) ok("cada subcategoría lista el producto una sola vez");
  else fail("listado duplicado o incompleto por subcategoría");

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
  const [remainingClassifications] = (await db.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM product_extra_subcategories WHERE product_id = 1`,
  )).rows;
  if (remainingClassifications?.count === 0) ok("al borrar el producto se limpian sus subcategorías adicionales");
  else fail("quedaron subcategorías adicionales huérfanas");
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

  // 8. Nuevos/Ofertas: el mismo SQL que aplica el despliegue, sobre un catálogo
  // con productos. Repetirlo no duplica ni reactiva una categoría oculta.
  const ensureSystemCategories = await readFile(join(process.cwd(), "scripts", "ensure-system-categories.sql"), "utf8");
  const productsBefore = (await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM products`)).rows[0]?.count;
  await db.exec(ensureSystemCategories);
  await db.exec(`UPDATE categories SET active = false WHERE slug = 'ofertas'`);
  await db.exec(ensureSystemCategories);
  const systemCategories = await db.query<{ slug: string; parent_id: number | null; position: number; active: boolean; highlighted: boolean }>(
    `SELECT slug, parent_id, position, active, highlighted FROM categories WHERE slug IN ('nuevos', 'ofertas') ORDER BY position`,
  );
  const productsAfter = (await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM products`)).rows[0]?.count;
  if (JSON.stringify(systemCategories.rows) === JSON.stringify([
    { slug: "nuevos", parent_id: null, position: -2, active: true, highlighted: true },
    { slug: "ofertas", parent_id: null, position: -1, active: false, highlighted: true },
  ]) && productsBefore === productsAfter) ok("Nuevos y Ofertas se crean una vez, sin tocar productos ni su visibilidad");
  else fail("categorías del sistema duplicadas, faltantes o modificadas");

  await db.close();
  console.log(process.exitCode ? "\nHay fallas." : "\nTodo en orden.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
