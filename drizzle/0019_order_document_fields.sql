ALTER TABLE "orders" ADD COLUMN "document_type" text DEFAULT 'ci' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "document_complement" text;