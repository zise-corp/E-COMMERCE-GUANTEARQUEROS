ALTER TABLE "orders" ADD COLUMN "invoice_requested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_id" text;