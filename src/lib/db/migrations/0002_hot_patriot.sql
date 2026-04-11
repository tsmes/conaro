CREATE TYPE "public"."list_type" AS ENUM('allow', 'block');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'accepting_applications', 'reviewing');--> statement-breakpoint
CREATE TABLE "convention_artist_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"convention_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"list_type" "list_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "convention_artist_lists_convention_profile_unique" UNIQUE("convention_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"convention_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"event_start_date" date NOT NULL,
	"event_end_date" date,
	"application_open_date" date,
	"application_close_date" date,
	"venue_name" text,
	"venue_address" text,
	"venue_city" text,
	"venue_country" text,
	"map_embed_url" text,
	"available_stands" integer,
	"table_dimensions" text,
	"price_info" text,
	"setup_time" text,
	"teardown_time" text,
	"amenities" jsonb,
	"field_requirements" jsonb,
	"min_portfolio_images" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "conventions" ADD COLUMN "logo_path" text;--> statement-breakpoint
ALTER TABLE "convention_artist_lists" ADD CONSTRAINT "convention_artist_lists_convention_id_conventions_id_fk" FOREIGN KEY ("convention_id") REFERENCES "public"."conventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convention_artist_lists" ADD CONSTRAINT "convention_artist_lists_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_convention_id_conventions_id_fk" FOREIGN KEY ("convention_id") REFERENCES "public"."conventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_convention_id_idx" ON "events" USING btree ("convention_id");