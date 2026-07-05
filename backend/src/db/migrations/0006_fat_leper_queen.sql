CREATE TABLE IF NOT EXISTS "user_branches" (
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_branches_user_id_company_id_branch_id_pk" PRIMARY KEY("user_id","company_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_divisions" (
	"user_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"division" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_divisions_user_id_branch_id_division_pk" PRIMARY KEY("user_id","branch_id","division")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "branch_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
