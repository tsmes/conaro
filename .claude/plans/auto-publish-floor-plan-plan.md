# Implementation Plan: Auto-publish floor plan

Spec: `.claude/plans/auto-publish-floor-plan-spec.md`

## Technical Decisions

- **Two nullable columns on `events`:** `floorPlanPublishedAt timestamp` (null = not public) + `floorPlanAutoPublishDaysBefore integer` (null = off). Inserted next to the existing `floorPlan` jsonb. Drizzle migration auto-generated.
- **Server actions live at `(authenticated)/conventions/manage/events/[eventId]/floor-plan/actions.ts`** — colocated with the editor, mirroring how `publishResults` lives in `applications/actions.ts`.
- **Cron handles the date arithmetic in JS, not SQL.** `eventStartDate` is stored as a `YYYY-MM-DD` string; JS subtraction is cleaner than column-driven SQL intervals. Candidate set is small per tick.
- **Auto-publish consumes its own setting** in the same UPDATE: sets `floorPlanPublishedAt = now()` and clears `floorPlanAutoPublishDaysBefore`. Re-firing requires the organizer to deliberately re-enable it.
- **UI is two independent toggles:** "Make floor plan public" (manual, on/off — always available), and "Auto-publish [N] days before event" (toggle + small number input). Manual toggle is disabled with a tooltip while `event.status !== "results_published"`.
- **Visibility gates migrate to `event.floorPlanPublishedAt !== null`.** Three viewer-side gates flip; the organizer-editor 404 is removed entirely (REQ-9).
- **No backfill.** Existing `results_published` events lose their floor-plan tab on deploy until the organizer manually publishes — per REQ-8.

## Tasks

> **Status:** All 6 tasks committed (`057830b0`, `bd99a580`, `19eb4a78`, `158db78f`, `e038a0b4`, `4e451bca`). One incidental landing-list bug fix landed alongside (`193adc64`). Code review and manual testing pending.

### 1. ✅ Add schema columns + thread them into the event-context loader
Adds the two new columns to `events`, generates the drizzle migration, and pulls the columns into `getEventViewerContext` so downstream code can read them. No behavior change yet.

**Requirements:** REQ-1 (foundation), Infrastructure

**Files:**
- `src/lib/db/schema/events.ts` — add `floorPlanPublishedAt: timestamp("floor_plan_published_at", { mode: "date" })` and `floorPlanAutoPublishDaysBefore: integer("floor_plan_auto_publish_days_before")` after the existing `floorPlan` column.
- `src/lib/db/migrations/0019_*.sql` — new auto-generated migration. Apply via `npm run db:migrate`.
- `src/lib/events/event-context.ts` — add the two columns to the `loadEventRow` select. `EventViewerContext.event` shape extends automatically via the existing `NonNullable<Awaited<ReturnType<typeof loadEventRow>>>`.

**Approach:**
- `drizzle-kit generate` produces the SQL. Verify it's an additive migration (two `ADD COLUMN ... NULL` statements, no destructive ops).
- Apply locally via `npm run db:migrate`.
- No new tests yet — schema-only changes are caught by build + integration tests in later tasks.

**Verification:** `npm run db:migrate` applies cleanly. `npx tsc --noEmit` passes. `npm test` still passes.

**Depends on:** none

---

### 2. ✅ Unblock organizer floor-plan editor before results are published
Removes the `event.status !== "results_published"` redirect at the top of the organizer's floor-plan editor page so they can lay out tables during `reviewing` (and earlier statuses too). Pure deletion of three lines.

**Requirements:** REQ-9

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/page.tsx` — remove the redirect block (lines 26-28). Owner check via `getOrganizerEvent` stays.

**Approach:**
- Delete the gate. The downstream `getAcceptedArtistsForEvent` returns an empty list when no decisions exist; the editor handles that already.
- Add a small "no artists to assign yet" empty-state hint near the artist palette if it doesn't exist already (verify by inspection — punt to follow-up if it's already there).

**Verification:** Manual: visit `/conventions/manage/events/{id}/floor-plan` for events in each status. All should render the editor.

**Depends on:** none

---

### 3. ✅ Server actions: publish, unpublish, set auto-publish
Three server actions following the existing organizer mutation pattern. Drives the new UI in task 4 and is also the call site for the cron's "publish" path (cron uses a direct DB write, not the action).

**Requirements:** REQ-3, REQ-4, REQ-5

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/actions.ts` — new. Three exported actions:
  - `publishFloorPlan(_prev, formData)` — sets `floorPlanPublishedAt = new Date()`. Errors with `{ error: "Results must be published first" }` if `event.status !== "results_published"`.
  - `unpublishFloorPlan(_prev, formData)` — sets `floorPlanPublishedAt = null`. No status guard.
  - `setFloorPlanAutoPublish(_prev, formData)` — reads `daysBefore` (string or empty). Empty/missing → null; positive integer → number; otherwise `{ fieldErrors: { daysBefore: [...] } }`.
- `__tests__/integration/floor-plan-publish.test.ts` — new. Mirror `event-publish.test.ts`:
  - Auth + ownership rejections.
  - `publishFloorPlan` rejected when status is anything except `results_published`.
  - `publishFloorPlan` happy path sets the timestamp.
  - `unpublishFloorPlan` clears the timestamp.
  - `setFloorPlanAutoPublish` accepts positive int, rejects 0 / negative / non-numeric, accepts empty (clears).

**Approach:**
- Reuse the existing pattern from `actions.ts`: auth, profileId, eventId, `getOrganizerEvent`, then UPDATE with `updatedAt`.
- Each action calls `revalidatePath("/conventions/manage")`, `revalidatePath` for the event detail + floor-plan page, plus `/events/${event.id}` and `/events/${event.id}/floor-plan` so the public viewer flips immediately.
- No new notification triggers (per spec).

**Verification:** `npm test -- floor-plan-publish` green. Integration tests cover the happy paths and the status-precondition.

**Depends on:** task 1

---

### 4. ✅ `<FloorPlanPublishControls>` component on the editor page
Renders two independent toggles + the auto-publish days input. Uses the new actions.

**Requirements:** REQ-3, REQ-4, REQ-5

**Files:**
- `src/components/floor-plans/floor-plan-publish-controls.tsx` — new client component. Props: `eventId`, `eventStatus`, `floorPlanPublishedAt: Date | null`, `floorPlanAutoPublishDaysBefore: number | null`. Renders:
  - Status line: "Public since {date}" or "Not public yet".
  - Manual toggle: "Make floor plan public". Submitting calls `publishFloorPlan` (when toggling on) or `unpublishFloorPlan` (when toggling off). Disabled with `title` tooltip when `eventStatus !== "results_published"` plus a hint paragraph.
  - Auto-publish toggle: when off, shows just the toggle. When on, shows toggle + small number input "[N] days before event start". Submitting calls `setFloorPlanAutoPublish` with the integer (or null when toggled off).
- `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/page.tsx` — render `<FloorPlanPublishControls />` above the existing `<FloorPlanEditor />`. Plumb the two new fields from the `event` query result.
- `__tests__/components/floor-plan-publish-controls.test.tsx` — new. Render-tests for each major state combination.

**Approach:**
- Two `<form action={actionFn}>` blocks (one per concern) so they submit independently. Use `useActionState` to surface errors inline.
- Days input: `<input type="number" min="1" />` — server-side validation in task 3 is the source of truth.
- Reuse shadcn primitives where possible.

**Verification:** `npm test` green. Manual click-through on the editor page in each event status.

**Depends on:** tasks 1, 3

---

### 5. ✅ Cron auto-publish transition
Adds a third independent pass to the existing tick handler.

**Requirements:** REQ-5, REQ-6

**Files:**
- `src/app/api/cron/events/tick/route.ts` — after the existing two transitions, add a third:
  - SELECT eligible events (status = results_published, autoPublish set, publishedAt null).
  - In JS: compute `triggerDate = eventStartDate − daysBefore`; check `triggerDate <= todayUtc`.
  - Per-row guarded UPDATE re-asserting `floor_plan_published_at IS NULL AND floor_plan_auto_publish_days_before = <expected>`; sets both `floor_plan_published_at = now()` and `floor_plan_auto_publish_days_before = NULL`; `.returning({ id })`.
  - Increment `floorPlansPublished` counter.
  - Add `floorPlansPublished` to the JSON response.
- `__tests__/integration/event-cron.test.ts` — extend existing tests with four scenarios (fires when threshold met, doesn't fire pre-threshold, doesn't fire if status not results_published, doesn't re-fire if already published).

**Approach:**
- Mirror the existing two transitions' per-row guarded update style.
- No notifications.
- JS-side date math.

**Verification:** `npm test -- event-cron` green.

**Depends on:** task 1

---

### 6. ✅ Migrate the three viewer-side visibility gates to the new flag
Last task — flips the system-wide visibility model.

**Requirements:** REQ-1, REQ-2, REQ-7

**Files:**
- `src/app/(public)/events/[eventId]/floor-plan/page.tsx` — change to `if (!ctx.event.floorPlanPublishedAt) notFound();`.
- `src/lib/events/event-context.ts` — `shouldShowFloorPlanTab`: replace the status check with `if (!ctx.event.floorPlanPublishedAt) return false;`. Keep the "plan has tables" check.
- `src/lib/events/event-context.ts` — `hasAssignedTableForViewer`: replace the `event.status !== "results_published"` portion with `!ctx.event.floorPlanPublishedAt`.
- Verify no other call sites still gate floor-plan visibility on status by grep.

**Approach:**
- Single commit; the three gates flip together.

**Verification:** `npm test` green. Manual smoke-test: a fresh `results_published` event hides the floor-plan tab; toggling "Make floor plan public" in the editor makes it appear.

**Depends on:** tasks 1, 3, 4

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 1, 6 |
| REQ-2 | 3, 5 |
| REQ-3 | 3, 4 |
| REQ-4 | 3, 4 |
| REQ-5 | 3, 5 |
| REQ-6 | 5 |
| REQ-7 | 6 |
| REQ-8 | 1 |
| REQ-9 | 2 |

## Risks

- **Existing `results_published` events lose their floor-plan tab on deploy** until the organizer manually publishes. One-time UX surprise. Mitigated by ordering: visibility flip ships last, after the manual-control UI is in place.
- **`getAcceptedArtistsForEvent` pre-publish behavior** — if it errors rather than returning `[]` when no decisions exist, the editor breaks. Verify manually in task 2.
- **Cron date arithmetic** — easy to get off-by-one. Integration tests in task 5 cover boundary cases.
- **Toggle UX coordination** — two independent forms can race if the organizer hammers both at once. `revalidatePath` after each settles the page.
