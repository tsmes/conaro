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
  contactEmail: text("contact_email"),
  phone: text("phone"),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  socialLinks: text("social_links"),
  helpers: integer("helpers").default(0),
  accessibilityNeeds: text("accessibility_needs"),
  tableSizePreference: text("table_size_preference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
