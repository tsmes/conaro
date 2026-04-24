import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { profiles } from "./profiles";

// Private Q&A thread between an accepted artist and the event's organizer.
// Exactly one row per (event, artist) pair. Used as a clean aggregate for
// per-side lastReadAt and last-activity sorting on the organizer inbox.
export const eventThreads = pgTable(
  "event_threads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    artistProfileId: text("artist_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Updated on every insert into event_thread_messages so the organizer
    // inbox can sort by most-recent activity via a single indexed scan.
    lastMessageAt: timestamp("last_message_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    artistLastReadAt: timestamp("artist_last_read_at", { mode: "date" }),
    organizerLastReadAt: timestamp("organizer_last_read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("event_threads_event_artist_idx").on(
      table.eventId,
      table.artistProfileId
    ),
    index("event_threads_event_last_message_idx").on(
      table.eventId,
      table.lastMessageAt
    ),
  ]
);

// Append-only message log for a thread. Author is either the artist or the
// organizer — the thread already enforces the (event, artist) pair, so no
// additional membership check is needed at write time beyond the auth role.
export const eventThreadMessages = pgTable(
  "event_thread_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: text("thread_id")
      .notNull()
      .references(() => eventThreads.id, { onDelete: "cascade" }),
    authorProfileId: text("author_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("event_thread_messages_thread_created_idx").on(
      table.threadId,
      table.createdAt
    ),
  ]
);
