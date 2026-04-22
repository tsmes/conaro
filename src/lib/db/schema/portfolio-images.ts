import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

// Three buckets the artist organises their imagery into:
// - promo: marketing-friendly stand identity (logo, key visuals)
// - product: examples of items the artist sells
// - previous_stand: photos from past convention stands (with optional caption)
export const portfolioSectionEnum = pgEnum("portfolio_section", [
  "promo",
  "product",
  "previous_stand",
]);

export type PortfolioSection = (typeof portfolioSectionEnum.enumValues)[number];

export const portfolioImages = pgTable("portfolio_images", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sort_order").default(0).notNull(),
  section: portfolioSectionEnum("section").notNull().default("product"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
