ALTER TABLE "applications" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "genres" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "mediums" text[] DEFAULT '{}' NOT NULL;