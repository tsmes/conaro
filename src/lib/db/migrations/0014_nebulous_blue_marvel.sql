ALTER TYPE "public"."notification_type" ADD VALUE 'event_announcement';--> statement-breakpoint
CREATE TABLE "event_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"author_profile_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "acceptance_message" text;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "rejection_message" text;--> statement-breakpoint
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_announcements_event_id_idx" ON "event_announcements" USING btree ("event_id");