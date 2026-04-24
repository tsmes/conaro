CREATE TABLE "event_thread_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"author_profile_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"artist_profile_id" text NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"artist_last_read_at" timestamp,
	"organizer_last_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_thread_messages" ADD CONSTRAINT "event_thread_messages_thread_id_event_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."event_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_thread_messages" ADD CONSTRAINT "event_thread_messages_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_threads" ADD CONSTRAINT "event_threads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_threads" ADD CONSTRAINT "event_threads_artist_profile_id_profiles_id_fk" FOREIGN KEY ("artist_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_thread_messages_thread_created_idx" ON "event_thread_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_threads_event_artist_idx" ON "event_threads" USING btree ("event_id","artist_profile_id");--> statement-breakpoint
CREATE INDEX "event_threads_event_last_message_idx" ON "event_threads" USING btree ("event_id","last_message_at");