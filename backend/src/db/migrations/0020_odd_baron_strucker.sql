CREATE TABLE "high_margin_product_divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"high_margin_product_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "high_margin_product_divisions" ADD CONSTRAINT "high_margin_product_divisions_high_margin_product_id_high_margin_products_id_fk" FOREIGN KEY ("high_margin_product_id") REFERENCES "public"."high_margin_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_margin_product_divisions" ADD CONSTRAINT "high_margin_product_divisions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hm_product_division" ON "high_margin_product_divisions" USING btree ("high_margin_product_id","division_id");