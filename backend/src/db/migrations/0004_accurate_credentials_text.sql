ALTER TABLE "accurate_credentials" ALTER COLUMN "api_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accurate_credentials" ALTER COLUMN "signature_secret" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accurate_credentials" ALTER COLUMN "client_secret" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accurate_credentials" ALTER COLUMN "access_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accurate_credentials" ALTER COLUMN "refresh_token" SET DATA TYPE text;