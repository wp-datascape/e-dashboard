CREATE TABLE "divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"dormant_bucket" varchar(20) DEFAULT 'b2b_dc' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_division_company_branch_code" UNIQUE("company_id","branch_id","code")
);
--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unq_division_company_code_global" ON "divisions" USING btree ("company_id","code") WHERE "divisions"."branch_id" IS NULL;