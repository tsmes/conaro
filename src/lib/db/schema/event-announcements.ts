import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { events } from "./events";
import { profiles } from "./profiles";

// Organizer-authored announcements scoped to an event. Visible to any
// artist whose application on that event is currently accepted; used for
// pre-event logistics, day-of info, and similar updates between
// acceptance and the event date.
export const eventAnnouncements = pgTable(
  "event_announcements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    authorProfileId: text("author_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("event_announcements_event_id_idx").on(table.eventId),
  ]
);
