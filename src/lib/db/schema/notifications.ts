import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const notificationTypeEnum = pgEnum("notification_type", [
  "event_published",
  "event_opened",
  "new_event",
  "results_published",
  "application_revoked",
  "new_application",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    recipientProfileId: text("recipient_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_recipient_read_idx").on(
      table.recipientProfileId,
      table.isRead
    ),
  ]
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    notificationType: notificationTypeEnum("notification_type").notNull(),
    emailEnabled: boolean("email_enabled").notNull().default(false),
  },
  (table) => [
    unique("notification_preferences_profile_type_unique").on(
      table.profileId,
      table.notificationType
    ),
  ]
);
