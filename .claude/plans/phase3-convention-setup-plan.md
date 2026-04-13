# Implementation Plan: Phase 3 — Convention Setup

Spec: `.claude/plans/phase3-convention-setup-spec.md`

## Technical Decisions

- **Extend `conventions` table**: Add `description` (text, nullable), `websiteUrl` (text, nullable), `logoPath` (text, nullable) columns. Minimal schema change to existing table.
- **New `events` table with typed columns**: Status as pgEnum (`"draft"`, `"accepting_applications"`, `"reviewing"`). Dates as Drizzle `date` type with `mode: "string"` (ISO YYYY-MM-DD). Amenities as `jsonb`. Field requirements as `jsonb` mapping FieldKey → `"required" | "optional" | "not_requested"`. Separate `minPortfolioImages` integer column.
- **Single `convention_artist_lists` table**: `conventionId` + `profileId` (artist) + `listType` pgEnum (`"allow"` | `"block"`) + `createdAt`. Composite unique on `(conventionId, profileId)` so an artist can only be on one list per convention. Moving between lists = update `listType`.
- **Convention logo: API route**: `POST /api/conventions/logo` following the portfolio upload pattern. Single image, replaces on re-upload. Storage path: `conventions/{conventionId}/logo.webp`. 5 MB limit.
- **Artist search: API route**: `GET /api/artists/search?q=term` searches `profiles.displayName` and `artistProfiles.contactEmail` with ILIKE. Returns top 10 matches.
- **Convention ownership helpers**: Shared query helpers in `src/lib/conventions/queries.ts` for looking up organizer's convention and verifying event ownership. Reused across actions and pages.
- **Field requirements defaults**: When creating an event, initialize `fieldRequirements` JSONB from the field registry: fields with `required: true` → `"required"`, others → `"not_requested"`.
- **Route structure**: `/conventions` (public directory), `/conventions/manage` (organizer dashboard), `/conventions/manage/edit` (convention profile), `/conventions/manage/events/new` (create event), `/conventions/manage/events/[eventId]` (event detail/edit), `/conventions/manage/events/[eventId]/fields` (field config), `/conventions/manage/lists` (allow/block lists).
- **Event form: single form with visual sections**: One submit for all event fields, with Card sections for grouping (Basic, Dates, Location, Logistics).
- **Date inputs: native HTML `<input type="date">`**: Simple, no extra dependency, sufficient for date-only precision.
- **New shadcn components**: `checkbox` (amenities), `dialog` (artist search modal).

## Tasks

### 1. Install Phase 3 dependencies
- [x] completed

Add shadcn/ui components needed for Phase 3 forms.

**Requirements:** Infrastructure

**Files:**
- `package.json` — new dependencies added by shadcn CLI
- `src/components/ui/checkbox.tsx` — new: shadcn checkbox component
- `src/components/ui/dialog.tsx` — new: shadcn dialog component

**Approach:**
- Run `npx shadcn@latest add checkbox dialog`

**Verification:** `npm run build` succeeds
**Depends on:** none

### 2. Database schema: extend conventions, add events + convention_artist_lists
- [x] completed

Add new columns to conventions, create events table and convention_artist_lists table, generate and apply migration.

**Requirements:** Infrastructure (enables REQ-1, REQ-4, REQ-8, REQ-11, REQ-15)

**Files:**
- `src/lib/db/schema/conventions.ts` — modify: add `description`, `websiteUrl`, `logoPath` columns (all text, nullable)
- `src/lib/db/schema/events.ts` — new: events table with all structured fields
- `src/lib/db/schema/convention-artist-lists.ts` — new: convention_artist_lists table
- `src/lib/db/schema/index.ts` — modify: add exports for `events` and `conventionArtistLists`

**Approach:**
- Conventions: add three nullable text columns after `name`
- Events table columns:
  - `id` (text PK, uuid default)
  - `conventionId` (text, NOT NULL, FK → conventions.id ON DELETE CASCADE)
  - `name` (text, NOT NULL)
  - `description` (text, nullable)
  - `status` (pgEnum `event_status`: `"draft"`, `"accepting_applications"`, `"reviewing"`, NOT NULL, default `"draft"`)
  - `eventStartDate` (date, mode: "string", NOT NULL)
  - `eventEndDate` (date, mode: "string", nullable)
  - `applicationOpenDate` (date, mode: "string", nullable)
  - `applicationCloseDate` (date, mode: "string", nullable)
  - `venueName` (text, nullable)
  - `venueAddress` (text, nullable)
  - `venueCity` (text, nullable)
  - `venueCountry` (text, nullable)
  - `mapEmbedUrl` (text, nullable)
  - `availableStands` (integer, nullable)
  - `tableDimensions` (text, nullable)
  - `priceInfo` (text, nullable)
  - `setupTime` (text, nullable)
  - `teardownTime` (text, nullable)
  - `amenities` (jsonb, nullable) — shape: `{ electricity: boolean, wifi: boolean, tables: boolean, chairs: boolean, other: string }`
  - `fieldRequirements` (jsonb, nullable) — shape: `{ [FieldKey]: "required" | "optional" | "not_requested" }`
  - `minPortfolioImages` (integer, nullable)
  - `createdAt`, `updatedAt` (timestamps, default now, NOT NULL)
- Convention artist lists table columns:
  - `id` (text PK, uuid default)
  - `conventionId` (text, NOT NULL, FK → conventions.id ON DELETE CASCADE)
  - `profileId` (text, NOT NULL, FK → profiles.id ON DELETE CASCADE) — the artist's profile
  - `listType` (pgEnum `list_type`: `"allow"`, `"block"`, NOT NULL)
  - `createdAt` (timestamp, default now, NOT NULL)
  - Composite unique index on `(conventionId, profileId)`
- Add index on `events.conventionId` for efficient event lookups by convention
- Generate migration: `npm run db:generate`
- Apply migration: `npm run db:migrate`

**Verification:** Migration applies cleanly; `npm run build` succeeds; new tables visible in DB
**Depends on:** none

### 3. Validation schemas for convention, event, and field configuration
- [x] completed

Define Zod schemas for all Phase 3 form submissions.

**Requirements:** Infrastructure (enables REQ-1, REQ-4, REQ-5, REQ-8, REQ-9)

**Files:**
- `src/lib/validations/convention.ts` — new: conventionProfileSchema, eventSchema, fieldConfigSchema

**Approach:**
- `conventionProfileSchema`:
  - `name`: string, min 1, max 200
  - `description`: string, max 2000, optional, default ""
  - `websiteUrl`: string, max 500, refine for http(s):// or empty (same pattern as profile.ts), optional, default ""
- `eventSchema`:
  - `name`: string, min 1, max 200
  - `description`: string, max 5000, optional, default ""
  - `eventStartDate`: string, min 1 (required — ISO date format)
  - `eventEndDate`: string, optional, default ""
  - `applicationOpenDate`: string, optional, default ""
  - `applicationCloseDate`: string, optional, default ""
  - `venueName`: string, max 200, optional, default ""
  - `venueAddress`: string, max 500, optional, default ""
  - `venueCity`: string, max 200, optional, default ""
  - `venueCountry`: string, max 200, optional, default ""
  - `mapEmbedUrl`: string, max 1000, refine for http(s):// or empty, optional, default ""
  - `availableStands`: z.coerce.number().int().min(1).optional() or empty string → null
  - `tableDimensions`: string, max 200, optional, default ""
  - `priceInfo`: string, max 500, optional, default ""
  - `setupTime`: string, max 200, optional, default ""
  - `teardownTime`: string, max 200, optional, default ""
  - Amenities as individual boolean fields: `amenities_electricity`, `amenities_wifi`, `amenities_tables`, `amenities_chairs` (use z.coerce.boolean() or transform checkbox "on"/"off")
  - `amenities_other`: string, max 500, optional, default ""
  - Add refine: if eventEndDate is set, it must be >= eventStartDate
  - Add refine: if applicationCloseDate is set and applicationOpenDate is set, close >= open
- `fieldConfigSchema`:
  - Dynamic: for each FieldKey, value is `z.enum(["required", "optional", "not_requested"])`, default `"not_requested"`
  - `minPortfolioImages`: z.coerce.number().int().min(0).max(20).optional().default(0)
- Export inferred types for all schemas

**Verification:** `npm run build` compiles
**Depends on:** none

### 4. Convention ownership query helpers
- [x] completed

Shared functions for looking up organizer's convention and verifying event ownership.

**Requirements:** Infrastructure (reused by tasks 5–8)

**Files:**
- `src/lib/conventions/queries.ts` — new: getOrganizerConvention, getOrganizerEvent, buildDefaultFieldRequirements

**Approach:**
- `getOrganizerConvention(profileId: string)`: query conventions where `organizerId = profileId`, return the convention or null. Since organizerId is unique, this is always 0 or 1 result.
- `getOrganizerEvent(profileId: string, eventId: string)`: get convention via `getOrganizerConvention`, then query events where `id = eventId AND conventionId = convention.id`, return the event or null. This ensures the organizer owns the event through their convention.
- `buildDefaultFieldRequirements()`: iterate FIELD_REGISTRY, return an object mapping each key to `"required"` if `field.required` is true, `"not_requested"` otherwise. Used when creating new events.

**Verification:** `npm run build` compiles
**Depends on:** 2

### 5. Convention profile update action + logo upload API route
- [x] completed

Backend for editing convention profile text fields and uploading logo image.

**Requirements:** REQ-1, REQ-2

**Files:**
- `src/app/conventions/manage/actions.ts` — new: `updateConventionProfile` server action
- `src/app/api/conventions/logo/route.ts` — new: POST handler for logo upload

**Approach:**
- `updateConventionProfile` server action:
  - Signature: `(prevState: ActionState, formData: FormData) => Promise<ActionState>`
  - Auth check: `session.user.role === "organizer"`, get profileId
  - Parse FormData with `conventionProfileSchema`
  - Call `getOrganizerConvention(profileId)` — return error if not found
  - Update conventions table: set name, description (empty → null), websiteUrl (empty → null), updatedAt
  - `revalidatePath("/conventions/manage")`, `revalidatePath("/conventions/manage/edit")`, `revalidatePath("/conventions")`
  - Return `{ success: true }`
- Logo upload API route (`POST /api/conventions/logo`):
  - Auth check: organizer role, get profileId
  - Get convention via `getOrganizerConvention(profileId)`
  - Parse FormData, get file
  - Validate: ALLOWED_TYPES (JPEG/PNG/WebP), max 5 MB, sharp magic byte check
  - Call `processImage(buffer)` to resize + convert to WebP
  - Storage path: `conventions/${convention.id}/logo.webp`
  - If convention already has a `logoPath`, delete old file via `storage.delete()`
  - Upload new file via `storage.upload()`
  - Update `conventions.logoPath` in DB
  - Return `{ url: storage.getUrl(storagePath) }`

**Verification:** `npm run build` succeeds
**Depends on:** 2, 3, 4

### 6. Event CRUD + status transition actions
- [x] completed

Server actions for creating, editing events and managing application period status.

**Requirements:** REQ-4, REQ-5, REQ-6, REQ-11, REQ-12, REQ-13, REQ-14

**Files:**
- `src/app/conventions/manage/events/actions.ts` — new: `createEvent`, `updateEvent`, `openApplications`, `closeApplications`

**Approach:**
- `createEvent` server action:
  - Auth check: organizer role
  - Get convention via `getOrganizerConvention`
  - Parse FormData with `eventSchema`
  - Transform amenities checkbox fields into JSONB object: `{ electricity: bool, wifi: bool, tables: bool, chairs: bool, other: string }`
  - Build `fieldRequirements` using `buildDefaultFieldRequirements()`
  - Insert into events table with all fields, status defaults to "draft"
  - Normalize empty strings to null for optional fields
  - `revalidatePath("/conventions/manage")`
  - Return `{ success: true, eventId }` — extend ActionState or return via redirect
- `updateEvent` server action:
  - Auth check, get convention, verify event ownership via `getOrganizerEvent`
  - Parse FormData with `eventSchema`
  - Transform amenities, normalize empties to null
  - Update event row, set `updatedAt`
  - `revalidatePath` for manage dashboard and event detail
  - Return `{ success: true }`
- `openApplications` server action:
  - Auth check, verify event ownership
  - Check `event.status === "draft"` — return error if not
  - Update status to `"accepting_applications"`, set `updatedAt`
  - `revalidatePath` for event detail and dashboard
  - Return `{ success: true }`
- `closeApplications` server action:
  - Auth check, verify event ownership
  - Check `event.status === "accepting_applications"` — return error if not
  - Update status to `"reviewing"`, set `updatedAt`
  - `revalidatePath` for event detail and dashboard
  - Return `{ success: true }`

**Verification:** `npm run build` succeeds
**Depends on:** 2, 3, 4

### 7. Field configuration actions
- [x] completed

Server action for saving per-event field requirements and supporting copy from another event.

**Requirements:** REQ-8, REQ-9, REQ-10

**Files:**
- `src/app/conventions/manage/events/[eventId]/fields/actions.ts` — new: `updateFieldConfig`

**Approach:**
- `updateFieldConfig` server action:
  - Auth check: organizer role
  - Verify event ownership via `getOrganizerEvent`
  - Parse FormData: extract each field registry key's value (`"required"`, `"optional"`, `"not_requested"`), extract `minPortfolioImages`
  - Validate with `fieldConfigSchema`
  - Build fieldRequirements JSONB object from validated data
  - Update event: set `fieldRequirements` and `minPortfolioImages`, set `updatedAt`
  - `revalidatePath` for field config page and event detail
  - Return `{ success: true }`
- Copy from event is handled client-side: the server component for the field config page passes all events for the convention (with their fieldRequirements + minPortfolioImages) as props. The client form component has a "Copy from..." select that populates the form fields. On save, the standard `updateFieldConfig` action is called — no separate copy action needed.

**Verification:** `npm run build` succeeds
**Depends on:** 2, 3, 4

### 8. Artist search API route + allow/block list actions
- [x] completed

Backend for searching artists and managing convention-level lists.

**Requirements:** REQ-15, REQ-16, REQ-17

**Files:**
- `src/app/api/artists/search/route.ts` — new: GET handler for artist search
- `src/app/conventions/manage/lists/actions.ts` — new: `addToList`, `removeFromList`

**Approach:**
- Artist search (`GET /api/artists/search?q=term`):
  - Auth check: organizer role (only organizers need to search artists)
  - Get query param `q`, require min 2 characters
  - Query: join `profiles` + `artistProfiles` where `profiles.role = "artist"` and (`profiles.displayName ILIKE %q%` OR `artistProfiles.contactEmail ILIKE %q%`)
  - Return top 10 matches as `{ id: profiles.id, displayName, contactEmail }`
  - Use `ilike` from drizzle-orm for case-insensitive matching
- `addToList` server action:
  - Auth check: organizer role
  - Get convention via `getOrganizerConvention`
  - Parse input: `profileId` (artist), `listType` ("allow" | "block")
  - Validate the profileId belongs to an artist
  - Upsert into `conventionArtistLists`: if `(conventionId, profileId)` already exists, update `listType`; otherwise insert. Use Drizzle's `onConflictDoUpdate` on the composite unique
  - `revalidatePath("/conventions/manage/lists")`
  - Return `{ success: true }`
- `removeFromList` server action:
  - Auth check: organizer role
  - Get convention
  - Delete from `conventionArtistLists` where `conventionId` AND `profileId` match
  - `revalidatePath("/conventions/manage/lists")`
  - Return `{ success: true }`

**Verification:** `npm run build` succeeds
**Depends on:** 2, 4

### 9. Update navigation + registration redirect
- [x] completed

Update header link and organizer registration to point to new manage route.

**Requirements:** Infrastructure

**Files:**
- `src/components/layout/header.tsx` — modify: change organizer nav link from `/conventions` to `/conventions/manage`
- `src/app/register/organizer/actions.ts` — modify: change `redirectTo` from `"/conventions"` to `"/conventions/manage"`

**Approach:**
- Header: change the `href="/conventions"` inside the `session.user.role === "organizer"` block to `href="/conventions/manage"`
- Registration action: change the `redirectTo: "/conventions"` in the `signIn()` call to `redirectTo: "/conventions/manage"`

**Verification:** `npm run build` succeeds; organizer registration redirects to `/conventions/manage`; header link points to `/conventions/manage`
**Depends on:** none

### 10. Convention manage dashboard page
- [x] completed

The organizer's main view showing convention info overview and event list.

**Requirements:** REQ-7

**Files:**
- `src/app/conventions/manage/page.tsx` — new: server component

**Approach:**
- Auth check: redirect to `/login` if not organizer
- Fetch convention via `getOrganizerConvention(profileId)` — redirect to `/login` if not found
- Fetch all events for this convention, ordered by createdAt desc
- Layout: `container mx-auto max-w-4xl px-4 py-8` (slightly wider than profile page to accommodate event cards)
- Convention overview section: show name, description (truncated), logo (if exists), "Edit Convention" link to `/conventions/manage/edit`
- Events section:
  - Heading + "Create Event" button (link to `/conventions/manage/events/new`)
  - Event cards: each shows event name, event start date, status badge (color-coded: gray for draft, blue for accepting, yellow for reviewing), link to `/conventions/manage/events/[id]`
  - Empty state message if no events
- "Manage Lists" link to `/conventions/manage/lists`
- Use Card, Badge, Button, Separator from shadcn/ui

**Verification:** `npm run build` succeeds; page renders at `/conventions/manage` for logged-in organizers
**Depends on:** 4, 5, 6

### 11. Convention profile edit page + form component
- [x] completed

Page and form for editing convention name, description, website, and logo.

**Requirements:** REQ-1, REQ-2

**Files:**
- `src/app/conventions/manage/edit/page.tsx` — new: server component that fetches convention data
- `src/components/conventions/convention-profile-form.tsx` — new: client form component for text fields
- `src/components/conventions/convention-logo-upload.tsx` — new: client component for logo upload/replace

**Approach:**
- Server page:
  - Auth check, fetch convention with `getOrganizerConvention`
  - Pass convention data (name, description, websiteUrl, logoUrl) as props to form components
  - Layout: heading, Separator, two Card sections (Profile Info, Logo)
- Convention profile form:
  - `"use client"`, `useActionState` with `updateConventionProfile`
  - Fields: name (Input), description (Textarea), websiteUrl (Input)
  - Pre-fill with current values via defaultValues prop
  - Same error/success pattern as BasicInfoForm
- Convention logo upload:
  - `"use client"` component
  - Show current logo if `logoUrl` prop is set (use `<img>` tag)
  - Upload zone: simplified version of ImageUploadZone — accept single file, validate type (JPEG/PNG/WebP) and size (5 MB), POST to `/api/conventions/logo` with FormData
  - On success, update displayed image (use state + returned URL)
  - "Replace" button to trigger new upload when logo exists

**Verification:** `npm run build` succeeds; can edit convention profile and upload logo at `/conventions/manage/edit`
**Depends on:** 1, 5

### 12. Event form component + create event page
- [x] completed

Reusable event form and the create-event page.

**Requirements:** REQ-4, REQ-5

**Files:**
- `src/components/conventions/event-form.tsx` — new: client form component for event create/edit
- `src/app/conventions/manage/events/new/page.tsx` — new: server component wrapping the form for creation

**Approach:**
- Event form (`"use client"`):
  - Props: `action` (server action reference), `defaultValues` (optional, for edit mode)
  - `useActionState` with the provided action
  - Visual sections using Card components:
    - **Basic Info**: name (Input, required), description (Textarea)
    - **Dates**: eventStartDate (Input type="date", required), eventEndDate (Input type="date"), applicationOpenDate (Input type="date"), applicationCloseDate (Input type="date")
    - **Location**: venueName, venueAddress, venueCity, venueCountry (all Input), mapEmbedUrl (Input)
    - **Logistics**: availableStands (Input type="number"), tableDimensions (Input), priceInfo (Textarea), setupTime (Input), teardownTime (Input)
    - **Amenities**: checkboxes for electricity, wifi, tables, chairs (Checkbox component), amenities_other (Input)
  - Error/success display following established pattern
  - Submit button: "Create Event" or "Save Changes" based on mode prop
- Create page:
  - Auth check: organizer role
  - Verify organizer has a convention
  - Render EventForm with `createEvent` action, no defaultValues
  - Heading: "Create Event"

**Verification:** `npm run build` succeeds; form renders at `/conventions/manage/events/new`
**Depends on:** 1, 6

### 13. Event detail/edit page + status controls
- [x] completed

Page for viewing/editing an existing event with status management.

**Requirements:** REQ-6, REQ-7, REQ-11, REQ-12, REQ-13, REQ-14

**Files:**
- `src/app/conventions/manage/events/[eventId]/page.tsx` — new: server component
- `src/components/conventions/event-status-controls.tsx` — new: client component for status actions

**Approach:**
- Server page:
  - Auth check, fetch event via `getOrganizerEvent(profileId, eventId)` — 404 or redirect if not found
  - Pass event data as defaultValues to EventForm (reuse from task 12) with `updateEvent` action
  - Render status section above the form: current status badge + action button
  - Link to field configuration page: `/conventions/manage/events/[eventId]/fields`
  - Back link to dashboard
- Event status controls (`"use client"`):
  - Props: `eventId`, `currentStatus`, action references (`openApplications`, `closeApplications`)
  - Display current status as a prominent Badge
  - Conditional action button:
    - `"draft"` → "Open Applications" button (calls `openApplications`)
    - `"accepting_applications"` → "Close Applications" button (calls `closeApplications`)
    - `"reviewing"` → no action button, just "Reviewing" status text
  - Use `useActionState` for each action, show pending/error states
  - Status transitions are irreversible — show the action clearly but don't add confirmation dialogs (simple enough that a mis-click is not catastrophic for Phase 3; undo can be added later)

**Verification:** `npm run build` succeeds; can view/edit events and transition status at `/conventions/manage/events/[eventId]`
**Depends on:** 6, 12

### 14. Field configuration page + component
- [x] completed

Page for configuring which artist profile fields are required per event, with copy-from-event support.

**Requirements:** REQ-8, REQ-9, REQ-10

**Files:**
- `src/app/conventions/manage/events/[eventId]/fields/page.tsx` — new: server component
- `src/components/conventions/field-config-form.tsx` — new: client form component

**Approach:**
- Server page:
  - Auth check, fetch event via `getOrganizerEvent`
  - Fetch all events for this convention (for the "copy from" feature): query events where `conventionId = convention.id AND id != eventId`, select id, name, fieldRequirements, minPortfolioImages
  - Pass current event's fieldRequirements, minPortfolioImages, and the other events list as props
  - Layout: heading, description, back link to event detail, Card wrapping the form
- Field config form (`"use client"`):
  - Props: `eventId`, `currentConfig` (the JSONB field requirements or null), `minPortfolioImages`, `otherEvents` (array of { id, name, fieldRequirements, minPortfolioImages })
  - `useActionState` with `updateFieldConfig`
  - "Copy from..." section at the top: a Select dropdown listing other events by name. On change, populate all form fields with the selected event's config. Client-side only — no server call.
  - For each field in FIELD_REGISTRY: display a row with the field label and a Select dropdown with three options: "Not requested", "Optional", "Required". Group rows by section (Basic, Logistics, Portfolio) using subheadings.
  - When `portfolioImages` is set to "optional" or "required", show a `minPortfolioImages` number input below it
  - Pre-fill from `currentConfig` prop (or defaults if null)
  - Hidden input for `eventId`
  - Save button

**Verification:** `npm run build` succeeds; can configure fields and copy from another event at `/conventions/manage/events/[eventId]/fields`
**Depends on:** 1, 7

### 15. Allow/block list management page + components
- [x] completed

Page for viewing and managing convention-level artist lists.

**Requirements:** REQ-15, REQ-16, REQ-17

**Files:**
- `src/app/conventions/manage/lists/page.tsx` — new: server component
- `src/components/conventions/artist-list-manager.tsx` — new: client component displaying list entries with remove action
- `src/components/conventions/artist-search-dialog.tsx` — new: client component for searching and adding artists

**Approach:**
- Server page:
  - Auth check, fetch convention
  - Fetch all list entries: join `conventionArtistLists` with `profiles` and `artistProfiles` to get displayName and contactEmail for each listed artist
  - Separate into allow-list and block-list arrays
  - Pass to client components
  - Layout: heading, back link to dashboard, two sections (Allow List, Block List)
- Artist list manager (`"use client"`):
  - Props: `entries` (array of { id, profileId, displayName, contactEmail }), `listType`, `removeAction`
  - Renders a list of entries: each row shows display name, contact email, and a "Remove" button
  - Remove button calls `removeFromList` action with the profileId
  - Empty state message when no entries
  - "Add Artist" button opens the search dialog
- Artist search dialog (`"use client"`):
  - Props: `listType` ("allow" | "block"), `conventionId`, `addAction`, `existingProfileIds` (to exclude already-listed artists)
  - Uses Dialog component from shadcn
  - Search input with debounced fetch to `GET /api/artists/search?q={query}` (debounce ~300ms)
  - Display search results as a list: display name, contact email, "Add" button
  - Filter out artists already in either list (using existingProfileIds prop)
  - On "Add" click: call `addToList` action, close dialog on success, show error on failure
  - Loading state while searching

**Verification:** `npm run build` succeeds; can search artists and add/remove from lists at `/conventions/manage/lists`
**Depends on:** 1, 8

### 16. Public convention directory page
- [x] completed

Replace the stub page with a public listing of conventions.

**Requirements:** REQ-3

**Files:**
- `src/app/conventions/page.tsx` — modify: replace stub with public convention directory

**Approach:**
- No auth required (public page)
- Fetch all conventions that have both `name` and `description` set (per spec: "with a completed profile")
- For each convention, compute logoUrl via `storage.getUrl(logoPath)` if logoPath exists
- Layout: heading "Conventions", grid of convention cards (responsive: 1 col mobile, 2 cols sm, 3 cols lg)
- Each card: logo image (or placeholder if no logo), convention name, description (truncated to ~150 chars), website link (if set)
- No click-through to detail page (convention detail pages are out of scope — that's Phase 4 territory)
- Empty state: "No conventions yet" message

**Verification:** `npm run build` succeeds; page renders at `/conventions` showing conventions with completed profiles
**Depends on:** 2

### 17. Update test helpers + write tests
- [x] completed

Update the test database cleanup helper and write integration tests for Phase 3 backend.

**Requirements:** Infrastructure

**Files:**
- `__tests__/helpers/db.ts` — modify: add events and conventionArtistLists to cleanDatabase (before conventions in FK order), add helper functions for finding events and list entries
- `__tests__/integration/convention-profile.test.ts` — new: tests for updateConventionProfile action
- `__tests__/integration/event-crud.test.ts` — new: tests for createEvent, updateEvent, openApplications, closeApplications
- `__tests__/integration/field-config.test.ts` — new: tests for updateFieldConfig
- `__tests__/integration/convention-lists.test.ts` — new: tests for addToList, removeFromList, artist search
- `__tests__/unit/lib/validations-convention.test.ts` — new: tests for conventionProfileSchema, eventSchema, fieldConfigSchema

**Approach:**
- Update `cleanDatabase()`: add `await db.delete(conventionArtistLists)` and `await db.delete(events)` before the existing `await db.delete(conventions)` line
- Add helpers: `findEventsByConventionId(conventionId)`, `findListEntriesByConventionId(conventionId)`
- Add helper: `createTestOrganizer()` — creates a user + profile + convention in one call, returns all three. Many Phase 3 tests need an organizer setup.
- Add helper: `createTestArtist()` — creates a user + profile + artistProfile, returns all three. Needed for list tests.
- Convention profile tests:
  - Updates name, description, websiteUrl successfully
  - Returns field errors for invalid input (empty name, invalid URL)
  - Returns Unauthorized for non-organizer
- Event CRUD tests:
  - Creates event with required fields only (name + startDate)
  - Creates event with all fields
  - Updates existing event
  - Returns error for non-existent event or wrong organizer
  - `openApplications` transitions draft → accepting_applications
  - `openApplications` returns error when status is not draft
  - `closeApplications` transitions accepting_applications → reviewing
  - `closeApplications` returns error when status is not accepting_applications
- Field config tests:
  - Saves field requirements for all registry fields
  - Saves minPortfolioImages
  - Returns error for invalid event or wrong organizer
- List tests:
  - Adds artist to allow-list
  - Adds artist to block-list
  - Moving artist between lists (add to allow when already on block → updates listType)
  - Removes artist from list
  - Search returns matching artists by display name
  - Search returns matching artists by contact email
  - Search excludes non-artist profiles
- Validation tests:
  - conventionProfileSchema: valid input passes, empty name fails, invalid URL fails
  - eventSchema: valid with required fields only, valid with all fields, empty name fails, date ordering refines
  - fieldConfigSchema: valid config passes, invalid field state fails

**Verification:** `npm test` passes — all new and existing tests pass
**Depends on:** 2, 3, 4, 5, 6, 7, 8

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 2, 3, 5, 11 |
| REQ-2 | 5, 11 |
| REQ-3 | 16 |
| REQ-4 | 2, 3, 6, 12 |
| REQ-5 | 3, 6, 12 |
| REQ-6 | 6, 13 |
| REQ-7 | 10, 13 |
| REQ-8 | 2, 3, 7, 14 |
| REQ-9 | 3, 7, 14 |
| REQ-10 | 7, 14 |
| REQ-11 | 2, 6, 13 |
| REQ-12 | 6, 13 |
| REQ-13 | 6, 13 |
| REQ-14 | 6, 13 |
| REQ-15 | 2, 8, 15 |
| REQ-16 | 8, 15 |
| REQ-17 | 8, 15 |

## Risks

- **Drizzle `date` column with `mode: "string"`**: Need to verify this produces clean ISO date strings (YYYY-MM-DD) without timezone issues. If Drizzle returns dates with timezone info, may need to use `text` type instead and validate format in Zod.
- **JSONB typing in Drizzle**: Drizzle's `jsonb` column returns `unknown` by default. We'll need to cast/type-assert field requirements when reading from DB. Consider defining a typed wrapper or using Drizzle's `.$type<T>()` method on the jsonb column to provide compile-time type safety.
- **Composite unique constraint for lists**: The `onConflictDoUpdate` for the upsert pattern in task 8 requires naming the constraint or specifying the conflict target. Need to verify Drizzle supports this with the composite unique index.
- **FormData with checkboxes**: HTML checkboxes only include their value in FormData when checked. Unchecked checkboxes are absent from FormData entirely. The event schema needs to handle this: treat missing checkbox keys as `false`.
- **Event form complexity**: The event form has ~20 fields. Need to ensure the form doesn't feel overwhelming — visual section grouping with Card components helps, but the sheer number of fields is a UX consideration. Fields are optional except name and start date, which helps.
