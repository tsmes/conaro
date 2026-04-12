import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { conventions } from "./conventions";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "accepting_applications",
  "reviewing",
  "results_published",
]);

export type Amenities = {
  electricity: boolean;
  wifi: boolean;
  tables: boolean;
  chairs: boolean;
  other: string;
};

export type FieldRequirementState = "required" | "optional" | "not_requested";

export type FieldRequirements = Record<string, FieldRequirementState>;

export const events = pgTable(
  "events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conventionId: text("convention_id")
      .notNull()
      .references(() => conventions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: eventStatusEnum("status").notNull().default("draft"),
    eventStartDate: date("event_start_date", { mode: "string" }).notNull(),
    eventEndDate: date("event_end_date", { mode: "string" }),
    applicationOpenDate: date("application_open_date", { mode: "string" }),
    applicationCloseDate: date("application_close_date", { mode: "string" }),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    venueCity: text("venue_city"),
    venueCountry: text("venue_country"),
    mapEmbedUrl: text("map_embed_url"),
    availableStands: integer("available_stands"),
    tableDimensions: text("table_dimensions"),
    priceInfo: text("price_info"),
    setupTime: text("setup_time"),
    teardownTime: text("teardown_time"),
    amenities: jsonb("amenities").$type<Amenities>(),
    fieldRequirements: jsonb("field_requirements").$type<FieldRequirements>(),
    minPortfolioImages: integer("min_portfolio_images"),
    acceptanceMessage: text("acceptance_message"),
    rejectionMessage: text("rejection_message"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("events_convention_id_idx").on(table.conventionId)]
);
