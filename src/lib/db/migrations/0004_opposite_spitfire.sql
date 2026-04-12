ALTER TYPE "public"."application_status" ADD VALUE 'revoked';--> statement-breakpoint
ALTER TYPE "public"."event_status" ADD VALUE 'results_published';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "payment_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "acceptance_message" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "rejection_message" text;