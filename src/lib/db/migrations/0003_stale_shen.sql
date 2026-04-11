CREATE TYPE "public"."application_status" AS ENUM('submitted', 'under_review', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"is_block_listed" boolean DEFAULT false NOT NULL,
	"response_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applications_event_profile_unique" UNIQUE("event_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "convention_follows" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"convention_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "convention_follows_profile_convention_unique" UNIQUE("profile_id","convention_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convention_follows" ADD CONSTRAINT "convention_follows_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convention_follows" ADD CONSTRAINT "convention_follows_convention_id_conventions_id_fk" FOREIGN KEY ("convention_id") REFERENCES "public"."conventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_profile_id_idx" ON "applications" USING btree ("profile_id");