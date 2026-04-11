import { pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { conventions } from "./conventions";
import { profiles } from "./profiles";

export const listTypeEnum = pgEnum("list_type", ["allow", "block"]);

export const conventionArtistLists = pgTable(
  "convention_artist_lists",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conventionId: text("convention_id")
      .notNull()
      .references(() => conventions.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    listType: listTypeEnum("list_type").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("convention_artist_lists_convention_profile_unique").on(
      table.conventionId,
      table.profileId
    ),
  ]
);
