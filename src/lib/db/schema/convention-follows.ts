import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { conventions } from "./conventions";

export const conventionFollows = pgTable(
  "convention_follows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    conventionId: text("convention_id")
      .notNull()
      .references(() => conventions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("convention_follows_profile_convention_unique").on(
      table.profileId,
      table.conventionId
    ),
  ]
);
