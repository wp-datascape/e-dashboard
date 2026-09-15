CREATE TABLE "customer_status_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"division_id" integer,
	"period_type" varchar(10) NOT NULL,
	"checkpoint_date" date NOT NULL,
	"customer_id" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"is_relapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_status_snapshot" ADD CONSTRAINT "customer_status_snapshot_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_status_snapshot" ADD CONSTRAINT "customer_status_snapshot_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_status_snapshot" ADD CONSTRAINT "customer_status_snapshot_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customer_status_snapshot" ON "customer_status_snapshot" USING btree ("company_id","division_id","period_type","checkpoint_date","customer_id");--> statement-breakpoint
CREATE INDEX "idx_customer_status_snapshot_lookup" ON "customer_status_snapshot" USING btree ("company_id","division_id","period_type","checkpoint_date");