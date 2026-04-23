import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const conventions = pgTable("conventions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizerId: text("organizer_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  websiteUrl: text("website_url"),
  logoPath: text("logo_path"),
  guidelines: text("guidelines"),
  acceptanceMessage: text("acceptance_message"),
  rejectionMessage: text("rejection_message"),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
