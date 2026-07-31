CREATE TABLE "resend_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" text,
	"sender_email" varchar(255),
	"sender_name_default" varchar(255),
	"app_base_url" varchar(500),
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
