CREATE TABLE "intercompany_customer_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "division_override_id" integer;--> statement-breakpoint
ALTER TABLE "intercompany_customer_names" ADD CONSTRAINT "intercompany_customer_names_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_intercompany_names_company_name" ON "intercompany_customer_names" USING btree ("company_id","customer_name");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_division_override_id_divisions_id_fk" FOREIGN KEY ("division_override_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;