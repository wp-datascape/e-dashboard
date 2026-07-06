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
CREATE TABLE IF NOT EXISTS "business_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_configs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
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
