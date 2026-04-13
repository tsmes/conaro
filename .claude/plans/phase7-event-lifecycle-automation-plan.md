# Implementation Plan: Phase 7 — Event Lifecycle Automation

Spec: `.claude/plans/phase7-event-lifecycle-automation-spec.md`

## Technical Decisions

- **DB migration**: Add `published` to event_status enum. Add `event_published` to notification_type enum. Two `ALTER TYPE ADD VALUE` statements (non-transactional, same as Phase 5).
- **New `publishEvent` action**: Validates both dates set before transitioning draft → published. Triggers `notifyEventPublished`.
- **Split notifyEventOpened**: `notifyEventPublished` (new) handles the publish moment (followers + any-new-event subscribers). `notifyEventOpened` (simplified) only handles followers when applications open.
- **Cron endpoint**: `GET /api/cron/events/tick`, auth via `Authorization: Bearer <CRON_SECRET>`. Returns `{ opened: n, closed: n }`. Idempotent.
- **Date comparison**: ISO date strings ("YYYY-MM-DD") compared lexicographically. Today UTC = `new Date().toISOString().slice(0, 10)`.
  - Open condition: `status = 'published' AND applicationOpenDate <= today`
  - Close condition: `status = 'accepting_applications' AND applicationCloseDate < today`
- **Cron transitions fire notifications**: Cron-triggered application opening calls the same `notifyEventOpened` as manual open — unified behavior.
- **Status controls UI**:
  - draft → "Publish Event" (new action)
  - published → "Open Applications Now" (existing action)
  - accepting_applications → "Close Applications Now" (unchanged)
  - reviewing/results_published → no controls here
- **Public visibility filter**: `/events` and convention detail pages filter `status != 'draft'`. Events get a status badge so artists see what's apply-ready.
- **Event detail page**: Draft events 404 for non-owners. Published events show "Applications open on [date]" instead of Apply.
- **STATUS_LABELS**: Add `published: { label: "Published", variant: "default" }`.
- **Notification preferences**: Add `event_published` toggle for artists with label "Followed convention publishes a new event".
- **Env var**: `CRON_SECRET` added to `.env.example` and `.env.test`.

## Tasks

### 1. DB migration: extend event_status + notification_type enums
Add `published` to event_status, `event_published` to notification_type.

**Requirements:** Infrastructure (enables REQ-1, REQ-12)

**Files:**
- `src/lib/db/schema/events.ts` — modify: add `"published"` to eventStatusEnum array (between `"draft"` and `"accepting_applications"`)
- `src/lib/db/schema/notifications.ts` — modify: add `"event_published"` to notificationTypeEnum array

**Approach:**
- Update both enum arrays
- Generate migration: `npm run db:generate` (will produce ALTER TYPE ADD VALUE statements)
- Apply to dev + test databases

**Verification:** Migration applies cleanly; `npm run build` succeeds
**Depends on:** none

### 2. Update notification triggers (split publish and open)
Refactor notifyEventOpened to only handle followers. Add notifyEventPublished for the publish moment.

**Requirements:** REQ-13, REQ-14

**Files:**
- `src/lib/notifications/triggers.ts` — modify: simplify `notifyEventOpened`, add `notifyEventPublished`

**Approach:**
- `notifyEventPublished(eventId, eventName, conventionId)`:
  - Same recipient resolution as current `notifyEventOpened`: query followers + query any-new-event subscribers, deduplicate
  - Followers get type `event_published`, message: "New event: {eventName}"
  - Any-new-event subscribers (non-followers) get type `new_event`, message: "New event: {eventName} from [convention]"
  - Link: `/events/{eventId}`
- `notifyEventOpened(eventId, eventName, conventionId)`:
  - Simplify: only query followers. No more any-new-event logic.
  - All recipients get type `event_opened`, message: "Applications are now open for {eventName}"
  - Link: `/events/{eventId}`

**Verification:** `npm run build` compiles
**Depends on:** 1

### 3. Publish event action
New server action for transitioning draft → published with date validation.

**Requirements:** REQ-2, REQ-3, REQ-13

**Files:**
- `src/app/conventions/manage/events/actions.ts` — modify: add `publishEvent` server action

**Approach:**
- `publishEvent(_prevState, formData)`:
  - Auth check: organizer role
  - Get eventId from formData
  - Verify ownership via `getOrganizerEvent`
  - Verify `event.status === "draft"` — error if not
  - Verify both `event.applicationOpenDate` and `event.applicationCloseDate` are set (non-null) — error if missing with clear message
  - Update event: `status = "published"`, `updatedAt`
  - Call `notifyEventPublished(event.id, event.name, event.conventionId)` wrapped in try/catch with logging
  - Revalidate manage paths
  - Return `{ success: true }`

**Verification:** `npm run build` compiles
**Depends on:** 1, 2

### 4. Update openApplications to accept published status
Modify existing action so manual override works from either draft (legacy) or published states.

**Requirements:** REQ-10

**Files:**
- `src/app/conventions/manage/events/actions.ts` — modify: `openApplications` guard accepts both `draft` and `published`

**Approach:**
- Change the status check from `event.status !== "draft"` to `event.status !== "draft" && event.status !== "published"`
- This allows the manual "Open Applications Now" button on published events
- Keep the notification call (`notifyEventOpened`) — works the same way

**Verification:** `npm run build` succeeds
**Depends on:** 1

### 5. Cron endpoint for event lifecycle transitions
Create the cron API route with secret-based auth and transition logic.

**Requirements:** REQ-6, REQ-7, REQ-8, REQ-9

**Files:**
- `src/app/api/cron/events/tick/route.ts` — new: GET handler

**Approach:**
- Auth: read `Authorization` header, expect `Bearer <CRON_SECRET>`. If `CRON_SECRET` env var is missing or header doesn't match, return 401.
- Compute `todayUtc`: `new Date().toISOString().slice(0, 10)` → "YYYY-MM-DD"
- In a single transaction (or sequential queries):
  - SELECT events WHERE `status = 'published' AND applicationOpenDate IS NOT NULL AND applicationOpenDate <= todayUtc`
  - For each: UPDATE status to `accepting_applications`, `updatedAt = now`. Then call `notifyEventOpened(event.id, event.name, event.conventionId)` wrapped in try/catch.
  - SELECT events WHERE `status = 'accepting_applications' AND applicationCloseDate IS NOT NULL AND applicationCloseDate < todayUtc`
  - For each: UPDATE status to `reviewing`, `updatedAt = now`. (No notification for close — matches current closeApplications behavior.)
- Return `{ opened: <count>, closed: <count> }`
- Both queries/updates should be outside a single long transaction — process each event individually so a notification failure doesn't block other transitions

**Verification:** `curl` with wrong secret returns 401; with right secret returns JSON summary; integration test covers transitions
**Depends on:** 2

### 6. Update EventStatusControls UI
Add Publish Event button for draft, rename Open Applications for published state.

**Requirements:** REQ-2, REQ-10, REQ-11

**Files:**
- `src/components/conventions/event-status-controls.tsx` — modify: add published state, new publish action prop

**Approach:**
- Add `published` to STATUS_DISPLAY: `{ label: "Published", variant: "default" }`
- Add new prop `publishAction` alongside `openAction` and `closeAction`
- Button logic:
  - draft → "Publish Event" button using `publishAction`, `useActionState`
  - published → "Open Applications Now" button using `openAction` (existing)
  - accepting_applications → "Close Applications Now" button using `closeAction` (existing)
  - reviewing / results_published → no buttons
- Keep the same `useActionState` pattern for each

**Verification:** `npm run build` succeeds
**Depends on:** 3

### 7. Update event detail page (organizer) to wire publish action
Connect the new publishEvent action to EventStatusControls.

**Requirements:** REQ-2

**Files:**
- `src/app/conventions/manage/events/[eventId]/page.tsx` — modify: import publishEvent, pass to EventStatusControls

**Approach:**
- Import `publishEvent` from the actions file
- Pass as `publishAction={publishEvent}` to the EventStatusControls component

**Verification:** `npm run build` succeeds; page renders with Publish button for draft events
**Depends on:** 3, 6

### 8. Update STATUS_LABELS in organizer dashboard
Add published to the status labels on the manage page.

**Requirements:** Infrastructure (supports REQ-1)

**Files:**
- `src/app/conventions/manage/page.tsx` — modify: add `published` to STATUS_LABELS

**Approach:**
- Add `published: { label: "Published", variant: "default" }` to the STATUS_LABELS record
- The existing badge rendering will pick it up automatically

**Verification:** `npm run build` succeeds; manage dashboard shows "Published" badge for published events
**Depends on:** 1

### 9. Public visibility: events listing page
Update events page to show all non-draft events with status badges.

**Requirements:** REQ-4, REQ-5

**Files:**
- `src/app/events/page.tsx` — modify: filter `status != 'draft'`, add status badge to cards

**Approach:**
- Change `.where(eq(events.status, "accepting_applications"))` to use `ne(events.status, "draft")` (need to import `ne` from drizzle-orm)
- Select `status` column in the projection
- In each card, add a status badge: use same labels as organizer (Published, Accepting Applications, Reviewing, Results Published)
- Order: keep the existing COALESCE ordering (soonest deadline first)
- Update empty state text: "No events to show."

**Verification:** `npm run build` succeeds; page shows published events too, with badges
**Depends on:** 1

### 10. Public visibility: convention detail page
Update convention detail to show all non-draft events.

**Requirements:** REQ-4, REQ-5

**Files:**
- `src/app/conventions/[conventionId]/page.tsx` — modify: filter `status != 'draft'`, add status badge

**Approach:**
- Change the status filter in the events query from `eq(events.status, "accepting_applications")` to `ne(events.status, "draft")`
- Add a status badge on each event card (same as events page)
- Update heading to "Events" (from "Open Events") since not all are "open"
- Empty state: "No events to show."

**Verification:** `npm run build` succeeds; convention page shows published + open events
**Depends on:** 1

### 11. Event detail page visibility + apply section
Handle draft events (404) and published events (info message, no Apply button).

**Requirements:** REQ-4, REQ-5

**Files:**
- `src/app/events/[eventId]/page.tsx` — modify: 404 on draft, status-aware apply section

**Approach:**
- After fetching the event, if `status === "draft"`: call `notFound()`. Organizers can still access via `/conventions/manage/events/[eventId]`.
- Apply section logic:
  - `accepting_applications`: show Apply button (existing behavior)
  - `published`: show info box: "Applications will open on {applicationOpenDate}" instead of Apply button. No button.
  - `reviewing` / `results_published`: show "Not accepting applications" badge (existing)
- Update `isAccepting` to apply only when status is `accepting_applications` (unchanged behavior, but review the UI branches)

**Verification:** `npm run build` succeeds; draft events 404; published events show "opens on" message
**Depends on:** 1

### 12. Notification preferences: add event_published
Add the new notification type toggle for artists.

**Requirements:** REQ-15

**Files:**
- `src/app/settings/notifications/actions.ts` — modify: add `event_published` to ARTIST_TYPES
- `src/app/settings/notifications/page.tsx` — modify: add event_published entry to ARTIST_PREFERENCE_TYPES

**Approach:**
- Actions file: add `"event_published"` to the ARTIST_TYPES array
- Page file: add an entry to ARTIST_PREFERENCE_TYPES:
  - type: "event_published"
  - label: "Followed convention publishes a new event"
  - description: "When a convention you follow publishes a new event (before applications open)."
- Place it at the top of the list (above event_opened) for natural ordering

**Verification:** `npm run build` succeeds; preferences page shows the new toggle
**Depends on:** 1

### 13. Env var + update env files
Add CRON_SECRET to env examples.

**Requirements:** REQ-9

**Files:**
- `.env.example` — modify: add CRON_SECRET placeholder
- `.env.test` — modify: add CRON_SECRET with a fixed test value

**Approach:**
- Add `CRON_SECRET=` to `.env.example` (empty value, commented note "# Shared secret for cron endpoint auth")
- Add `CRON_SECRET=test-cron-secret` to `.env.test` for tests
- Note: these files may be blocked by the sensitive-files hook — user may need to edit manually

**Verification:** Files updated; tests can read the value via process.env
**Depends on:** none

### 14. Tests
Integration tests for publish, cron, and updated triggers.

**Requirements:** Infrastructure

**Files:**
- `__tests__/integration/event-publish.test.ts` — new: tests for `publishEvent` action
- `__tests__/integration/event-cron.test.ts` — new: tests for the cron endpoint (via direct function call or HTTP)
- `__tests__/integration/notifications.test.ts` — modify: add tests for `notifyEventPublished`, update existing notifyEventOpened tests to match new simplified behavior

**Approach:**
- Publish tests:
  - `publishEvent` transitions draft → published with both dates set
  - `publishEvent` rejects when dates missing (specific error)
  - `publishEvent` rejects when event not in draft
  - `publishEvent` rejects for non-organizer
  - `publishEvent` creates event_published + new_event notifications
- Cron tests:
  - Missing auth header → 401
  - Wrong secret → 401
  - Correct secret, event with open date reached → transitions to accepting_applications
  - Correct secret, event with close date passed → transitions to reviewing
  - Running twice is idempotent (no double transitions)
  - Cron transition fires event_opened notifications to followers
- Notification tests:
  - Update existing `notifyEventOpened` tests: verify it ONLY notifies followers now (not any-new-event subscribers)
  - New tests for `notifyEventPublished`: followers get event_published, any-new-event subscribers get new_event, dedup works
- Mock `process.env.CRON_SECRET` for cron tests

**Verification:** `npm test` — all tests pass
**Depends on:** 3, 5, 2

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 1, 8 |
| REQ-2 | 3, 6, 7 |
| REQ-3 | 3 |
| REQ-4 | 9, 10, 11 |
| REQ-5 | 9, 10, 11 |
| REQ-6 | 5 |
| REQ-7 | 5 |
| REQ-8 | 5 |
| REQ-9 | 5, 13 |
| REQ-10 | 4, 6 |
| REQ-11 | 6 |
| REQ-12 | 1 |
| REQ-13 | 2, 3 |
| REQ-14 | 2, 5 |
| REQ-15 | 12 |

## Risks

- **Enum migration non-transactional**: `ALTER TYPE ADD VALUE` cannot run inside a transaction in Postgres. Drizzle's migrator handles this fine (same as Phase 5) but worth re-noting. Applying the migration to dev/test should just work.
- **Cron failure isolation**: If one event's notification fails, subsequent events should still transition. The plan wraps each notification call in try/catch. Verify this in tests by mocking one notification call to throw.
- **Schedule backlog**: If the cron doesn't run for days, accumulated transitions happen on next run. All events whose dates have passed transition in one call. This is correct behavior but worth noting — if you need to "replay" carefully, individual transitions are still safe.
- **Existing events on main**: Any events currently in `draft` on production that organizers already expected to see on /events will still be hidden until the organizer publishes them. Not a bug, but may need user communication.
- **Env file editing restrictions**: The sensitive-files hook may block me from editing `.env.example` and `.env.test`. User may need to add `CRON_SECRET` to both files manually.
