CREATE TYPE "public"."portfolio_section" AS ENUM('promo', 'product', 'previous_stand');--> statement-breakpoint
ALTER TABLE "portfolio_images" ADD COLUMN "section" "portfolio_section" DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_images" ADD COLUMN "caption" text;