ALTER TABLE "orders" RENAME COLUMN "payment_ref" TO "transactionId";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "company_code" TO "companyCode";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "transaction_code" TO "codeTransaction";--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "transactionId" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "companyCode" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "dateRequest" text;
