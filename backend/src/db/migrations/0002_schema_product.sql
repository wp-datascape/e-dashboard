CREATE TABLE IF NOT EXISTS "channel_divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"channel_name" varchar(255) NOT NULL,
	"division" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "high_margin_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"product_id" integer,
	"product_category_id" integer,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"note" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "item_classification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"match_type" varchar(50) NOT NULL,
	"match_pattern" varchar(255) NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"item_type" varchar(20) DEFAULT 'unit' NOT NULL,
	"avg_margin_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_service" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_category_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
