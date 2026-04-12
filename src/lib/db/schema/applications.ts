import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { profiles } from "./profiles";

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "revoked",
]);

export interface SnapshotImage {
  id: string;
  filename: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

export interface ProfileSnapshot {
  displayName: string;
  realName: string | null;
  contactEmail: string | null;
  phone: string | null;
  bio: string | null;
  websiteUrl: string | null;
  socialLinks: string | null;
  helpers: number | null;
  accessibilityNeeds: string | null;
  tableSizePreference: string | null;
  notes: string | null;
  images: SnapshotImage[];
}

export const applications = pgTable(
  "applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    profileSnapshot: jsonb("profile_snapshot")
      .notNull()
      .$type<ProfileSnapshot>(),
    isBlockListed: boolean("is_block_listed").notNull().default(false),
    paymentConfirmed: boolean("payment_confirmed").notNull().default(false),
    responseMessage: text("response_message"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("applications_event_profile_unique").on(
      table.eventId,
      table.profileId
    ),
    index("applications_profile_id_idx").on(table.profileId),
  ]
);
