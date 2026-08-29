ALTER TABLE "brands" ADD COLUMN "logo_path" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "logo_file_id" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "is_own_brand" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "brands" SET "is_own_brand" = true WHERE "slug" = 'drei';
