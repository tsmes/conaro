import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const artistProfiles = pgTable("artist_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  profileId: text("profile_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  realName: text("real_name"),
  pronouns: text("pronouns"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  bio: text("bio"),
  priceRangeMinNok: integer("price_range_min_nok"),
  priceRangeMaxNok: integer("price_range_max_nok"),
  websiteUrl: text("website_url"),
  socialLinks: text("social_links"),
  helpers: integer("helpers").default(0),
  accessibilityNeeds: text("accessibility_needs"),
  notes: text("notes"),
  genres: text("genres").array().notNull().default([]),
  mediums: text("mediums").array().notNull().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
