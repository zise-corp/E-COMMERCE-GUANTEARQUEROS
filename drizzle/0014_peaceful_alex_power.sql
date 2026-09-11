CREATE TABLE "payment_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider" text DEFAULT 'yopago' NOT NULL,
	"method" text NOT NULL,
	"company_code" text NOT NULL,
	"transaction_code" text NOT NULL,
	"transaction_id" text,
	"qr_id" text,
	"qr_data" text,
	"card_url" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_status" text,
	"failure_code" text,
	"failure_message" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_attempt_id" integer,
	"provider" text DEFAULT 'yopago' NOT NULL,
	"event_type" text NOT NULL,
	"event_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "financial_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "company_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "transaction_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "confirmation_email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_transaction_code_unique" ON "payment_attempts" USING btree ("transaction_code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_transaction_company_unique" ON "payment_attempts" USING btree ("transaction_id","company_code");--> statement-breakpoint
CREATE INDEX "payment_attempts_order_id_idx" ON "payment_attempts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_event_key_unique" ON "payment_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "payment_events_payment_attempt_id_idx" ON "payment_events" USING btree ("payment_attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_public_id_unique" ON "orders" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "orders_transaction_company_idx" ON "orders" USING btree ("payment_ref","company_code");