ALTER TYPE "public"."application_status" ADD VALUE 'waitlisted';--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "waitlist_enabled" boolean DEFAULT false NOT NULL;