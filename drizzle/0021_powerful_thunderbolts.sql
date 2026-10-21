CREATE TABLE "product_extra_subcategories" (
	"product_id" integer NOT NULL,
	"subcategory_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_extra_subcategories" ADD CONSTRAINT "product_extra_subcategories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_extra_subcategories" ADD CONSTRAINT "product_extra_subcategories_subcategory_id_categories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_extra_subcategories_product_subcategory_uq" ON "product_extra_subcategories" USING btree ("product_id","subcategory_id");--> statement-breakpoint
CREATE INDEX "product_extra_subcategories_subcategory_idx" ON "product_extra_subcategories" USING btree ("subcategory_id");