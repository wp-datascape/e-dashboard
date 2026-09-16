ALTER TABLE "customer_status_snapshot" ADD COLUMN "revenue" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_status_snapshot" ADD COLUMN "gross_profit" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_status_snapshot" ADD COLUMN "transaction_count" integer DEFAULT 0 NOT NULL;