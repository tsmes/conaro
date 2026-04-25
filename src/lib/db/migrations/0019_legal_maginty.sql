ALTER TABLE "events" ADD COLUMN "floor_plan_published_at" timestamp;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "floor_plan_auto_publish_days_before" integer;