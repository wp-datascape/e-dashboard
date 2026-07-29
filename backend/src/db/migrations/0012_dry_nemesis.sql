ALTER TABLE "user_divisions" DROP CONSTRAINT "user_divisions_user_id_branch_id_division_pk";--> statement-breakpoint
ALTER TABLE "user_divisions" ALTER COLUMN "division_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_divisions" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_divisions" ALTER COLUMN "division_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_user_id_branch_id_division_id_pk" PRIMARY KEY("user_id","branch_id","division_id");--> statement-breakpoint
ALTER TABLE "user_divisions" DROP COLUMN "division";--> statement-breakpoint
ALTER TABLE "channel_divisions" DROP COLUMN "division";