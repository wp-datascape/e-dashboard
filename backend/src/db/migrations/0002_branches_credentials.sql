CREATE TABLE IF NOT EXISTS "company_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_company_branch_code" UNIQUE("company_id","code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accurate_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"auth_method" varchar(20) DEFAULT 'api_token' NOT NULL,
	"api_token" text,
	"signature_secret" text,
	"client_id" varchar(255),
	"client_secret" text,
	"callback_url" varchar(500),
	"subdomain" varchar(100) NOT NULL,
	"company_db_id" varchar(100),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accurate_credentials_branch_id_unique" UNIQUE("branch_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_branches" ADD CONSTRAINT "company_branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accurate_credentials" ADD CONSTRAINT "accurate_credentials_branch_id_company_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."company_branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
