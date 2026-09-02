CREATE TABLE "metric_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"metric_key" varchar(60) NOT NULL,
	"cache_key" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_metric_cache_lookup" ON "metric_cache" USING btree ("company_id","metric_key","cache_key");--> statement-breakpoint
CREATE INDEX "idx_metric_cache_expiry" ON "metric_cache" USING btree ("expires_at");