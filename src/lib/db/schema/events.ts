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
  "published",
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

// Structured table-size offering chosen at apply time. Each option
// carries a stable `id` so applications referencing it remain valid
// across edits. `widthCm` / `depthCm` are optional at the type level
// for tolerance with legacy rows — the floor planner gates on them
// and new entries are expected to fill them in.
export interface TableSizeOption {
  id: string;
  label: string;
  priceNok: number | null;
  widthCm?: number;
  depthCm?: number;
}

// Organizer-authored floor plan for the event. Rooms are axis-aligned
// rectangles in centimetres; tables are axis-aligned rectangles that
// reference a `tableSizeOptions[].id` for their real-world dimensions.
// Assignments reference `applications.id` of accepted artists on this
// event. The floor planner writes the whole shape on every save.
export interface FloorPlanRoom {
  id: string;
  name: string;
  x: number; // cm, top-left
  y: number;
  widthCm: number;
  heightCm: number;
}

// Tables are scoped to a room — `x`/`y` are room-local coordinates in cm
// (0,0 = top-left of the *unrotated* rect). `roomId` must reference a
// `FloorPlan.rooms[].id`. `rotationDeg` is one of 0/90/180/270 and
// applies around the rect's centre at render time. Legacy plans
// without `roomId`/`rotationDeg` get backfilled on read.
export interface FloorPlanTable {
  id: string;
  label: string;
  tableSizeOptionId: string;
  roomId: string;
  rotationDeg: 0 | 90 | 180 | 270;
  x: number;
  y: number;
  assignedApplicationId: string | null;
}

// Free-text annotations the organizer can drop onto a room (doorways,
// entries, "coffee cart", direction markers, etc.). Coordinates are
// room-local, same convention as tables. Rotation pivots around the
// label's centre at render time.
export interface FloorPlanLabel {
  id: string;
  roomId: string;
  text: string;
  x: number;
  y: number;
  rotationDeg: 0 | 90 | 180 | 270;
}

export interface FloorPlan {
  rooms: FloorPlanRoom[];
  tables: FloorPlanTable[];
  labels?: FloorPlanLabel[];
}

// Programme schedule. Stored as a flat array; the public tab groups
// items by date and sorts by startTime in JS. Times are HH:mm
// (24-hour). Date is YYYY-MM-DD and must fall within the event's
// start/end range — enforced at save time.
export interface ProgrammeItem {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  title: string;
  room?: string;
  speaker?: string;
}

// Featured guest. Title is free text (e.g. "Guest of honour",
// "Workshop host") so organizers can phrase the role themselves;
// the v1 grid doesn't carry a separate spotlight flag. imagePath is
// the storage key returned by the upload route, not a URL.
export interface Guest {
  id: string;
  name: string;
  title: string;
  role?: string;
  pronouns?: string;
  bio?: string;
  imagePath?: string;
  websiteUrl?: string;
  socialLinks?: { type: string; url: string }[];
}

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
    guidelinesOverride: text("guidelines_override"),
    tableSizeOptions: jsonb("table_size_options")
      .$type<TableSizeOption[]>()
      .notNull()
      .default([]),
    maxAssistants: integer("max_assistants").notNull().default(0),
    assistantFeeNok: integer("assistant_fee_nok"),
    floorPlan: jsonb("floor_plan").$type<FloorPlan>(),
    floorPlanPublishedAt: timestamp("floor_plan_published_at", {
      mode: "date",
    }),
    floorPlanAutoPublishDaysBefore: integer(
      "floor_plan_auto_publish_days_before"
    ),
    programme: jsonb("programme").$type<ProgrammeItem[]>(),
    guests: jsonb("guests").$type<Guest[]>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("events_convention_id_idx").on(table.conventionId)]
);
