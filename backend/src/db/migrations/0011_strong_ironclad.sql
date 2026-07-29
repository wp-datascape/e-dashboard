CREATE TABLE "divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer,
	"key" varchar(30) NOT NULL,
	"label" varchar(50) NOT NULL,
	"dormant_category" varchar(20) NOT NULL,
	"is_protected" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_divisions" ADD COLUMN "division_id" integer;--> statement-breakpoint
ALTER TABLE "channel_divisions" ADD COLUMN "division_id" integer;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "divisions_company_branch_key_idx" ON "divisions" USING btree ("company_id","branch_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "divisions_company_key_global_idx" ON "divisions" USING btree ("company_id","key") WHERE "divisions"."branch_id" IS NULL;--> statement-breakpoint
ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_divisions" ADD CONSTRAINT "channel_divisions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;