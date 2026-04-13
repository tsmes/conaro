# Implementation Plan: Phase 4 — Application Flow

Spec: `.claude/plans/phase4-application-flow-spec.md`

## Technical Decisions

- **New `applications` table**: `id`, `eventId` (FK), `profileId` (FK, the artist), `status` (pgEnum: `submitted`, `under_review`, `accepted`, `rejected`), `profileSnapshot` (JSONB — full profile data + images array with snapshot storage paths), `isBlockListed` (boolean, default false), `responseMessage` (text, nullable — populated in Phase 5), `createdAt`, `updatedAt`. Unique constraint on `(eventId, profileId)` to prevent duplicate applications.
- **New `convention_follows` table**: `id`, `profileId` (FK, the artist), `conventionId` (FK), `createdAt`. Unique constraint on `(profileId, conventionId)`.
- **Profile snapshot as JSONB**: Single `profileSnapshot` column containing all text fields from `profiles` + `artist_profiles`, plus an `images` array with `{ id, filename, storagePath, width, height, sortOrder }` for each copied image. No separate snapshot images table.
- **StorageAdapter `copy` method**: Add `copy(fromKey, toKey): Promise<void>` to the interface. LocalStorageAdapter implements with `fs.copyFile`. Snapshot path: `snapshots/{eventId}/{applicationId}/{imageId}.webp`.
- **Application validation function**: `validateProfileForEvent()` in `src/lib/applications/validation.ts`. Cross-references event's `fieldRequirements` + `minPortfolioImages` against profile data. Returns `{ valid: true }` or `{ valid: false, missingFields: [...] }`.
- **Route structure**: `/events` (browse open events), `/events/[eventId]` (event detail + apply), `/conventions/[conventionId]` (convention detail + follow).
- **Application status enum**: All 4 values defined upfront (`submitted`, `under_review`, `accepted`, `rejected`). Only `submitted` used in Phase 4.
- **Header navigation**: Add "Events" link for artists and unauthenticated users.
- **Convention directory**: Make cards clickable, linking to `/conventions/[conventionId]`.
- **No new shadcn components needed**.

## Tasks

### 1. Add `copy` method to StorageAdapter
Extend the storage abstraction to support copying files between keys, needed for snapshotting portfolio images.

**Requirements:** Infrastructure (enables REQ-8)

**Files:**
- `src/lib/storage/types.ts` — modify: add `copy(fromKey: string, toKey: string): Promise<void>` to the interface
- `src/lib/storage/local.ts` — modify: implement `copy` using `fs.copyFile`

**Approach:**
- Add `copy` to the `StorageAdapter` interface
- In `LocalStorageAdapter.copy`: resolve both paths under `UPLOADS_DIR`, create target directory with `fs.mkdir(recursive)`, then `fs.copyFile(from, to)`

**Verification:** `npm run build` compiles
**Depends on:** none

### 2. Database schema: applications, convention_follows + migration
Create the two new tables and generate the migration.

**Requirements:** Infrastructure (enables REQ-4, REQ-7, REQ-8, REQ-13, REQ-14)

**Files:**
- `src/lib/db/schema/applications.ts` — new: applications table with status enum, profileSnapshot JSONB, isBlockListed, responseMessage
- `src/lib/db/schema/convention-follows.ts` — new: convention_follows table
- `src/lib/db/schema/index.ts` — modify: add exports for new tables

**Approach:**
- Applications table:
  - `id` (text PK, uuid)
  - `eventId` (text, NOT NULL, FK → events.id ON DELETE CASCADE)
  - `profileId` (text, NOT NULL, FK → profiles.id ON DELETE CASCADE)
  - `status` (pgEnum `application_status`: `submitted`, `under_review`, `accepted`, `rejected`, NOT NULL, default `submitted`)
  - `profileSnapshot` (jsonb, NOT NULL) — typed with `$type<ProfileSnapshot>()`
  - `isBlockListed` (boolean, NOT NULL, default false)
  - `responseMessage` (text, nullable)
  - `createdAt`, `updatedAt` (timestamps)
  - Unique constraint on `(eventId, profileId)`
  - Index on `profileId` for dashboard queries
- Define `ProfileSnapshot` type in the schema file:
  ```
  { displayName, realName, contactEmail, phone, bio, websiteUrl, socialLinks,
    helpers, accessibilityNeeds, tableSizePreference, notes,
    images: Array<{ id, filename, storagePath, width, height, sortOrder }> }
  ```
- Convention follows table:
  - `id` (text PK, uuid)
  - `profileId` (text, NOT NULL, FK → profiles.id ON DELETE CASCADE)
  - `conventionId` (text, NOT NULL, FK → conventions.id ON DELETE CASCADE)
  - `createdAt` (timestamp)
  - Unique constraint on `(profileId, conventionId)`
- Generate migration: `npm run db:generate`
- Apply to dev and test databases

**Verification:** Migration applies cleanly; `npm run build` succeeds
**Depends on:** none

### 3. Application validation logic
Pure function that checks an artist's profile against an event's field requirements.

**Requirements:** REQ-6, REQ-11

**Files:**
- `src/lib/applications/validation.ts` — new: `validateProfileForEvent` function + types

**Approach:**
- Define types:
  - `MissingField = { key: string; label: string; section: "basic" | "logistics" | "portfolio" }`
  - `ValidationResult = { valid: true } | { valid: false; missingFields: MissingField[] }`
- `validateProfileForEvent(fieldRequirements, minPortfolioImages, profile, artistProfile, imageCount)`:
  - Iterate `FIELD_REGISTRY`. For each field where `fieldRequirements[key] === "required"`:
    - Look up the value from profile (for `displayName`) or artistProfile (for all others)
    - For text/email/phone/url/textarea fields: check `!!value` (truthy, non-empty)
    - For `helpers` (number): check `value !== null && value !== undefined` (0 is a valid value)
    - For `portfolioImages`: check `imageCount >= (minPortfolioImages || 1)` — if portfolioImages is required, at least `minPortfolioImages` images (minimum 1) must exist
  - Collect all failing fields into `missingFields` with label and section from the registry
  - Return `{ valid: true }` if empty, otherwise `{ valid: false, missingFields }`
- This is a pure function — no DB access, no side effects

**Verification:** Unit tests pass (written in task 15)
**Depends on:** none

### 4. Apply action (submit application with snapshot)
The core server action that validates the profile, creates the snapshot, copies images, and inserts the application.

**Requirements:** REQ-6, REQ-7, REQ-8, REQ-9, REQ-10

**Files:**
- `src/app/events/[eventId]/actions.ts` — new: `applyToEvent` server action

**Approach:**
- `applyToEvent` server action:
  - Auth check: `session.user.role === "artist"`, get `profileId`
  - Fetch event by `eventId`, verify `status === "accepting_applications"`
  - Check for existing application (same event + profile) — return error if duplicate
  - Fetch profile, artistProfile, and portfolio images (sorted by sortOrder)
  - Call `validateProfileForEvent(...)` — if invalid, return `{ error: "missing_fields", missingFields: [...] }`. Extend ActionState or return a typed response.
  - Check block-list: query `conventionArtistLists` for the event's `conventionId` + artist's `profileId` where `listType = "block"`. Set `isBlockListed = true` if found.
  - Build `ProfileSnapshot` JSONB from profile + artistProfile data
  - Generate `applicationId` (uuid)
  - Copy portfolio images: for each image, call `storage.copy(image.storagePath, snapshotPath)` where `snapshotPath = snapshots/{eventId}/{applicationId}/{image.id}.webp`. Add to snapshot's images array with the snapshot storagePath.
  - Insert application row in a transaction (to ensure atomicity with the snapshot)
  - `revalidatePath("/dashboard")`, `revalidatePath("/events/[eventId]")`
  - Return `{ success: true }`
- Error handling: if image copy fails mid-way, clean up any already-copied snapshot images

**Verification:** `npm run build` compiles; integration tests pass (task 15)
**Depends on:** 1, 2, 3

### 5. Follow/unfollow actions
Server actions for toggling convention follow state.

**Requirements:** REQ-4

**Files:**
- `src/app/conventions/[conventionId]/actions.ts` — new: `followConvention`, `unfollowConvention`

**Approach:**
- `followConvention`:
  - Auth check: artist role
  - Verify convention exists
  - Insert into `conventionFollows` — use `onConflictDoNothing` for idempotency
  - `revalidatePath` for convention detail and dashboard
  - Return `{ success: true }`
- `unfollowConvention`:
  - Auth check: artist role
  - Delete from `conventionFollows` where `profileId + conventionId`
  - `revalidatePath` for convention detail and dashboard
  - Return `{ success: true }`

**Verification:** `npm run build` compiles
**Depends on:** 2

### 6. Update header navigation
Add "Events" link for artists and unauthenticated users.

**Requirements:** Infrastructure

**Files:**
- `src/components/layout/header.tsx` — modify: add "Events" link

**Approach:**
- Add `<Link href="/events">Events</Link>` in the artist nav section (after Dashboard, before Profile)
- Also add it in the unauthenticated section (before "Log in")
- Uses the same `buttonVariants({ variant: "ghost" })` pattern

**Verification:** `npm run build` succeeds
**Depends on:** none

### 7. Events browsing page
Public page listing all events currently accepting applications.

**Requirements:** REQ-1, REQ-3

**Files:**
- `src/app/events/page.tsx` — new: server component for event browsing

**Approach:**
- No auth required (public page), but check session for displaying "you must log in to apply" context
- Query events where `status = "accepting_applications"`, join with conventions to get convention name and logo
- Support convention filter via URL search param `?convention={conventionId}` — if present, filter events by conventionId
- Fetch distinct conventions that have open events for the filter dropdown
- Layout: heading, filter dropdown (native select or link-based), responsive grid of event cards
- Each card shows: convention name, event name, event dates, city/country, available stands count, application close date (if set)
- Cards link to `/events/[eventId]`
- Order by `applicationCloseDate` ascending (nearest deadline first), then by `eventStartDate`

**Verification:** `npm run build` succeeds; page renders at `/events`
**Depends on:** 2

### 8. Event detail page with apply button
Artist-facing event detail page showing all structured info and the apply mechanism.

**Requirements:** REQ-2, REQ-6, REQ-7, REQ-10, REQ-11, REQ-12

**Files:**
- `src/app/events/[eventId]/page.tsx` — new: server component for event detail
- `src/components/events/apply-button.tsx` — new: client component handling the apply flow (validation result, missing fields, success)

**Approach:**
- Server page:
  - Fetch event by ID, verify `status === "accepting_applications"` (show info but no apply button if not)
  - Join with convention for convention name/logo
  - If artist is logged in: fetch their profile, artistProfile, imageCount, and check for existing application
  - If already applied: show "Already Applied" badge instead of apply button
  - Pass event detail data + artist validation state to components
  - Layout: back link to `/events`, convention name + event name heading, structured info sections (dates, location, logistics, amenities), apply section at bottom
- Apply button component (`"use client"`):
  - Props: `eventId`, `validationResult` (from server), `hasExistingApplication`
  - If `hasExistingApplication`: show "Already Applied" badge
  - If `validationResult.valid`: show "Apply" button that calls `applyToEvent` action
  - If `!validationResult.valid`: show "Apply" button that reveals the missing fields list with links to profile sections
  - On successful submission: show "Application submitted!" confirmation
  - Uses `useActionState` for the apply action

**Verification:** `npm run build` succeeds; page renders at `/events/[eventId]`
**Depends on:** 3, 4, 7

### 9. Convention detail page with follow button
Public page showing convention info with follow/unfollow for logged-in artists.

**Requirements:** REQ-4

**Files:**
- `src/app/conventions/[conventionId]/page.tsx` — new: server component
- `src/components/conventions/follow-button.tsx` — new: client component for follow toggle

**Approach:**
- Server page:
  - Fetch convention by ID — 404 if not found
  - If artist is logged in: check if they already follow this convention
  - Fetch events for this convention that are in `accepting_applications` status (to show "open events" count)
  - Layout: convention name, logo, description, website link, follow button (for artists), list of open events (linking to `/events/[eventId]`)
- Follow button (`"use client"`):
  - Props: `conventionId`, `isFollowing` (boolean)
  - Toggle between "Follow" and "Following" states
  - Calls `followConvention` or `unfollowConvention` action
  - Uses `useActionState` or `useTransition` for pending state

**Verification:** `npm run build` succeeds; page renders at `/conventions/[conventionId]`
**Depends on:** 5

### 10. Update convention directory — make cards clickable
Link convention cards to the new detail page.

**Requirements:** Infrastructure (supports REQ-4)

**Files:**
- `src/app/conventions/page.tsx` — modify: wrap cards in links to `/conventions/[conventionId]`

**Approach:**
- Wrap each `<Card>` in a `<Link href={/conventions/${convention.id}}>` with `className="block"`
- Add hover effect (`transition-colors hover:bg-muted/50`) matching the event card pattern from the organizer dashboard

**Verification:** `npm run build` succeeds; convention cards are clickable
**Depends on:** 9

### 11. Expand artist dashboard — applications list + followed conventions
Replace the stub dashboard with application history and followed conventions.

**Requirements:** REQ-5, REQ-13, REQ-14, REQ-15

**Files:**
- `src/app/dashboard/page.tsx` — modify: add applications list and followed conventions

**Approach:**
- Keep existing profile completeness card
- Add new queries (in parallel with existing ones):
  - Fetch applications for this profileId, joined with events and conventions to get names/dates. Order by `createdAt` desc.
  - Fetch convention follows for this profileId, joined with conventions to get name/logo
- Applications section:
  - List of application cards showing: convention name, event name, date applied, status badge
  - Status badge colors: gray (`submitted`), blue (`under_review`), green (`accepted`), red (`rejected`)
  - If `responseMessage` exists (Phase 5), show it below the status
  - Empty state: "No applications yet. Browse events to get started." with link to `/events`
- Followed conventions section:
  - Simple list of convention names with links to `/conventions/[conventionId]`
  - Empty state: "You're not following any conventions yet."
- Layout: 2-column grid on desktop (applications left, profile + follows right)

**Verification:** `npm run build` succeeds; dashboard shows applications and follows
**Depends on:** 2, 7

### 12. Update test helpers + write tests
Update cleanDatabase for new tables, add test helpers, write integration and unit tests.

**Requirements:** Infrastructure

**Files:**
- `__tests__/helpers/db.ts` — modify: add new tables to `cleanDatabase`, add helpers
- `__tests__/unit/lib/application-validation.test.ts` — new: unit tests for `validateProfileForEvent`
- `__tests__/integration/apply-to-event.test.ts` — new: integration tests for `applyToEvent` action
- `__tests__/integration/convention-follows.test.ts` — new: integration tests for follow/unfollow

**Approach:**
- Update `cleanDatabase()`: add `await db.delete(applications)` and `await db.delete(conventionFollows)` before existing deletes (applications before events due to FK)
- Add helpers:
  - `createTestEvent(conventionId, overrides?)` — creates an event with defaults, returns event row
  - `findApplicationsByEventId(eventId)` — for asserting application state
  - `findFollowsByProfileId(profileId)` — for asserting follow state
- Validation unit tests:
  - Returns valid when all required fields are filled
  - Returns missing fields when required fields are empty
  - Handles `portfolioImages` requirement with minPortfolioImages
  - Handles `helpers` field (number type, 0 is valid)
  - Ignores fields marked `not_requested` or `optional`
- Apply integration tests:
  - Happy path: creates application with snapshot, returns success
  - Rejects when event not accepting applications
  - Rejects duplicate application to same event
  - Returns missing fields when profile is incomplete
  - Sets isBlockListed when artist is on block list
  - Rejects non-artist role
- Follow integration tests:
  - Follow creates a record
  - Follow is idempotent (second follow doesn't error)
  - Unfollow removes the record
  - Rejects non-artist role

**Verification:** `npm test` — all tests pass
**Depends on:** 1, 2, 3, 4, 5

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 7 |
| REQ-2 | 8 |
| REQ-3 | 7 |
| REQ-4 | 5, 9, 10 |
| REQ-5 | 11 |
| REQ-6 | 3, 4, 8 |
| REQ-7 | 4, 8 |
| REQ-8 | 1, 2, 4 |
| REQ-9 | 4 |
| REQ-10 | 4, 8 |
| REQ-11 | 3, 8 |
| REQ-12 | 8 |
| REQ-13 | 11 |
| REQ-14 | 2, 11 |
| REQ-15 | 2, 11 |

## Risks

- **Image copy performance**: Copying up to 20 portfolio images synchronously during application submission could be slow. For the local storage adapter this is fast (local disk copy), but with R2 it would be network I/O. For MVP this is acceptable — optimize with background processing later if needed.
- **StorageAdapter `copy` assumption**: The local adapter can implement `copy` with `fs.copyFile`. When switching to R2, the S3 `CopyObject` API supports server-side copy (no download+upload needed). The interface is clean, but the R2 implementation will need to handle cross-bucket scenarios if applicable.
- **Transaction scope for apply**: The application insert and image copies should ideally be atomic. However, storage operations can't be rolled back in a DB transaction. The approach is: copy images first, then insert the DB record in a transaction. On DB failure, clean up copied images. On image copy failure, don't insert.
- **Concurrent duplicate applications**: The unique constraint on `(eventId, profileId)` prevents duplicates at the DB level. The pre-check for existing applications is a UX optimization to show the right UI state, but the constraint is the safety net.
