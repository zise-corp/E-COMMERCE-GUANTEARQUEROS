CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"size" text NOT NULL,
	"previous_stock" integer NOT NULL,
	"delta" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"admin_user_id" integer,
	"order_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_balance_check" CHECK ("inventory_movements"."new_stock" = "inventory_movements"."previous_stock" + "inventory_movements"."delta" AND "inventory_movements"."new_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_variants_stock_check" CHECK ("product_variants"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_product_created_idx" ON "inventory_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_order_idx" ON "inventory_movements" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_size_uq" ON "product_variants" USING btree ("product_id","size");--> statement-breakpoint
-- El inventario anterior solo tenía un total por producto. Se distribuye de
-- forma provisional entre tallas, conservando exactamente ese total.
INSERT INTO "product_variants" ("product_id", "size", "stock", "position")
SELECT p.id, s.size,
       (p.stock / cardinality(p.sizes)) + CASE WHEN s.position <= (p.stock % cardinality(p.sizes)) THEN 1 ELSE 0 END,
       s.position - 1
FROM "products" p
CROSS JOIN LATERAL unnest(p.sizes) WITH ORDINALITY AS s(size, position)
WHERE cardinality(p.sizes) > 0;--> statement-breakpoint
INSERT INTO "product_variants" ("product_id", "size", "stock", "position")
SELECT id, '', stock, 0 FROM "products" WHERE cardinality(sizes) = 0;--> statement-breakpoint
INSERT INTO "inventory_movements" ("product_id", "product_name", "size", "previous_stock", "delta", "new_stock", "reason", "note")
SELECT v.product_id, p.name, v.size, 0, v.stock, v.stock, 'migration',
       CASE WHEN cardinality(p.sizes) > 1 THEN 'Distribución provisional del stock anterior; revisar cada talla.'
            ELSE 'Stock anterior migrado.' END
FROM "product_variants" v JOIN "products" p ON p.id = v.product_id
WHERE v.stock > 0;--> statement-breakpoint
-- Durante la transición, la versión anterior de la tienda sigue descontando
-- solamente products.stock. Este trigger conserva el total por talla hasta que
-- el código nuevo se despliegue. No interviene si el código nuevo ya actualizó
-- las tallas antes del total.
CREATE FUNCTION sync_legacy_product_stock() RETURNS trigger AS $$
DECLARE
  represented integer;
  remaining integer;
  changed integer;
  variant_row record;
BEGIN
  IF NEW.stock = OLD.stock THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(stock), 0)::integer INTO represented FROM product_variants WHERE product_id = NEW.id;
  IF represented = NEW.stock THEN RETURN NEW; END IF;
  IF represented <> OLD.stock THEN
    RAISE EXCEPTION 'El inventario por talla del producto % no coincide con el total anterior', NEW.id;
  END IF;
  IF NEW.stock > OLD.stock THEN
    SELECT id, size, stock INTO variant_row FROM product_variants
    WHERE product_id = NEW.id ORDER BY position, id LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El producto % no tiene opciones de inventario', NEW.id; END IF;
    changed := NEW.stock - OLD.stock;
    UPDATE product_variants SET stock = stock + changed WHERE id = variant_row.id;
    INSERT INTO inventory_movements (product_id, product_name, size, previous_stock, delta, new_stock, reason, note)
    VALUES (NEW.id, NEW.name, variant_row.size, variant_row.stock, changed, variant_row.stock + changed,
            'adjustment', 'Cambio desde la versión anterior; revisar la talla asignada.');
  ELSE
    remaining := OLD.stock - NEW.stock;
    FOR variant_row IN SELECT id, size, stock FROM product_variants
      WHERE product_id = NEW.id AND stock > 0 ORDER BY position, id FOR UPDATE
    LOOP
      changed := LEAST(variant_row.stock, remaining);
      UPDATE product_variants SET stock = stock - changed WHERE id = variant_row.id;
      INSERT INTO inventory_movements (product_id, product_name, size, previous_stock, delta, new_stock, reason, note)
      VALUES (NEW.id, NEW.name, variant_row.size, variant_row.stock, -changed, variant_row.stock - changed,
              'adjustment', 'Cambio desde la versión anterior; revisar la talla asignada.');
      remaining := remaining - changed;
      EXIT WHEN remaining = 0;
    END LOOP;
    IF remaining <> 0 THEN RAISE EXCEPTION 'Stock insuficiente para sincronizar el producto %', NEW.id; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER products_legacy_stock_sync AFTER UPDATE OF stock ON products
FOR EACH ROW EXECUTE FUNCTION sync_legacy_product_stock();
