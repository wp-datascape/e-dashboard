DROP INDEX "uq_pareto_snapshot_customer_period";--> statement-breakpoint
ALTER TABLE "pareto_period_snapshots" ADD COLUMN "checkpoint" varchar(20) DEFAULT 'closed' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pareto_snapshot_customer_period" ON "pareto_period_snapshots" USING btree ("customer_id","period_type","period_key","checkpoint");