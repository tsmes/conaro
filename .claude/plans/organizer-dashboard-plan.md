# Implementation Plan: Organizer dashboard

Spec: `.claude/plans/organizer-dashboard-spec.md`

## Technical Decisions

- **Layout: server page + client view split** — `src/app/(authenticated)/conventions/manage/page.tsx` owns auth + `Promise.all` data fetching; `src/components/conventions/organizer-dashboard-view.tsx` is the presentational component. Mirrors the artist `/dashboard` split.
- **"Current event" = nearest upcoming / ongoing** — single query `events where convention_id = ? AND event_start_date >= current_date order by event_start_date asc limit 1`. Rule is deterministic and explainable.
- **Application counts extracted to a helper** — `getApplicationCounts(eventId)` in `src/lib/conventions/queries.ts`. Single `GROUP BY status` query returning `{total, accepted}`. Replaces the two inline count copies already in the codebase and adds a third call site on the dashboard.
- **Unread thread count: event-scoped** — `getUnreadThreadCountForEvent(eventId)` in `src/lib/threads/queries.ts`. One SQL statement using a subquery to find the latest message per thread, counting only those where the latest author is the artist AND `lastMessageAt > organizerLastReadAt` (or `organizerLastReadAt IS NULL`). Dashboard calls it exactly once (for the current event) — no call when the slot is the empty state.
- **Recent announcements: convention-scoped** — `getRecentAnnouncementsForConvention(conventionId, limit)` joins `event_announcements` → `events`, ordered `desc(createdAt)`, limit 3 by default.
- **Login-redirect: one-line fix** — `src/app/(public)/login/actions.ts:41-42` organizer branch flips to `/conventions/manage`.
- **Nav de-dup** — Remove the duplicate `Conventions` entry in `ORGANIZER_NAV`. Keep `Overview` pointing at `/conventions/manage` with the `LayoutDashboard` icon.
- **Re-use existing primitives** — `ORGANIZER_STATUS_LABELS`, `formatDateRangeNo`, `formatRelativeTime`, `Card`, `Badge`, `Button`. No new UI primitives.
- **`firstName` derivation mirrors artist dashboard** — `profile.displayName → session.user.name → "Organizer"`.

## Tasks

### 1. Fix the organizer login redirect ✅

One-line change + test update. Independent of everything else; ship first.

**Requirements:** REQ-1.

**Files:**
- `src/app/(public)/login/actions.ts` — change `"/conventions"` to `"/conventions/manage"` in the organizer branch at line 41-42.
- `__tests__/integration/login.test.ts` — update the existing redirect assertion for the organizer path.

**Approach:** trivial string swap; update the matching test expectation.

**Verification:** `npm test -- __tests__/integration/login.test.ts` green; `npm run build` green.
**Depends on:** none.

### 2. Extract `getApplicationCounts(eventId)` helper ✅

Replace two copy-pasted inline `count()` queries with one shared helper, used by the new dashboard and by the two existing call sites.

**Requirements:** Infrastructure (enables REQ-4).

**Files:**
- `src/lib/conventions/queries.ts` — add exported async function `getApplicationCounts(eventId: string): Promise<{ total: number; accepted: number }>`. Single query: `SELECT status, COUNT(*) FROM applications WHERE event_id = ? GROUP BY status`. Sum all rows to get `total`; pick the `accepted` bucket.
- `src/app/(authenticated)/conventions/manage/events/[eventId]/page.tsx` — replace the inline `count()` (at ~line 57-61) with `getApplicationCounts(event.id).total`.
- `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/page.tsx` — same substitution if applicable.
- `__tests__/integration/application-counts.test.ts` — new. Cases: zero applications → `{total: 0, accepted: 0}`; mix of statuses → correct counts; event with only accepted.

**Approach:** Non-behavioral refactor at the two existing sites plus new helper.

**Verification:** All existing tests still green; new test green; build green.
**Depends on:** none.

### 3. Add `getUnreadThreadCountForEvent(eventId)` helper ✅

New single-query helper the dashboard calls once per current-event render.

**Requirements:** Infrastructure (enables REQ-4).

**Files:**
- `src/lib/threads/queries.ts` — add exported async function `getUnreadThreadCountForEvent(eventId: string): Promise<number>`.
- `__tests__/integration/thread-unread-count.test.ts` — new. Cases:
  - Event with no threads → `0`.
  - Thread whose only message is from the artist, organizer has never read → `1`.
  - Same thread after organizer reads → `0`.
  - Organizer replies last → `0` (latest author is organizer).
  - Artist replies again after organizer's reply → `1`.
  - Two threads both unread → `2`.

**Approach:**
- Use a correlated subquery or `DISTINCT ON` to get the latest message per thread, joined to `event_threads`:
  ```
  SELECT COUNT(*)
  FROM event_threads et
  WHERE et.event_id = :eventId
    AND EXISTS (
      SELECT 1 FROM event_thread_messages m
      WHERE m.thread_id = et.id
      ORDER BY m.created_at DESC LIMIT 1
    )
    AND (
      SELECT m2.author_profile_id FROM event_thread_messages m2
      WHERE m2.thread_id = et.id
      ORDER BY m2.created_at DESC LIMIT 1
    ) = et.artist_profile_id
    AND (et.organizer_last_read_at IS NULL
         OR et.last_message_at > et.organizer_last_read_at)
  ```
- In Drizzle: use `sql` template or nested `db.select().from(...).where(...)` subqueries. Single round-trip is the goal.

**Verification:** Integration test green; build green.
**Depends on:** none.

### 4. Add `getRecentAnnouncementsForConvention(conventionId, limit)` helper ✅

**Requirements:** Infrastructure (enables REQ-5).

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/announcements/actions.ts` — add exported async function `getRecentAnnouncementsForConvention(conventionId: string, limit = 3): Promise<{ id, subject, createdAt, eventId, eventName }[]>`. Inner-join `event_announcements` with `events` on `events.id = event_announcements.event_id` filtered by `events.convention_id`, ordered `desc(createdAt)`, `limit`.
- `__tests__/integration/announcements.test.ts` (new if none exists; or extend existing announcements test file). Cases: empty convention → `[]`; multiple announcements across 2 events → sorted by `createdAt` desc, respects limit.

**Verification:** Integration test green; build green.
**Depends on:** none.

### 5. Add `getCurrentEventForConvention(conventionId)` helper

The "nearest upcoming / ongoing" selection rule, isolated in one helper.

**Requirements:** Infrastructure (enables REQ-3).

**Files:**
- `src/lib/conventions/queries.ts` — add exported async function `getCurrentEventForConvention(conventionId: string): Promise<Event | null>`. Query: `WHERE convention_id = ? AND event_start_date >= current_date ORDER BY event_start_date ASC LIMIT 1`. Use Drizzle's `sql` helper for `current_date` comparison against the `date`-typed column (or pass a JS `new Date()` formatted as YYYY-MM-DD).
- `__tests__/integration/current-event.test.ts` — new. Cases:
  - No events → `null`.
  - All events in the past → `null`.
  - One event today → returned.
  - Multiple upcoming events → the one with earliest `eventStartDate` is returned.
  - Mix of past + future → only the earliest future one is returned.

**Verification:** Integration test green; build green.
**Depends on:** none.

### 6. Build `<OrganizerDashboardView>` component

Pure presentational component + tests. No data fetching inside — all props come from the page.

**Requirements:** REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7.

**Files:**
- `src/components/conventions/organizer-dashboard-view.tsx` — new. Props:
  ```ts
  interface OrganizerDashboardViewProps {
    firstName: string;
    conventionName: string;
    currentEvent: {
      id: string;
      name: string;
      status: string;
      eventStartDate: string;
      eventEndDate: string | null;
      applicationCount: number;
      acceptedCount: number;
      unreadThreadCount: number;
    } | null;
    recentAnnouncements: Array<{
      id: string;
      subject: string;
      eventId: string;
      eventName: string;
      createdAt: Date;
    }>;
    events: Array<{
      id: string;
      name: string;
      status: string;
      eventStartDate: string;
      eventEndDate: string | null;
      venueCity: string | null;
      venueCountry: string | null;
      availableStands: number | null;
    }>;
  }
  ```
  Layout (top to bottom):
  1. **Welcome hero** — eyebrow "Overview", H1 "Welcome back, {firstName}", subtitle with the convention name + inline "Edit convention" link.
  2. **Current event card** — if `currentEvent`, a `<Card>` with event name, status `<Badge variant={ORGANIZER_STATUS_LABELS[status].variant}>`, date range (`formatDateRangeNo`), three chips showing applicationCount / acceptedCount / unreadThreadCount, action buttons "Review applications" and "Event settings". If `currentEvent === null`, an empty state "No upcoming event" + "Create event" CTA.
  3. **Messages widget** — if `recentAnnouncements.length > 0`, a section with up to 3 cards: subject, "Posted to {eventName}", `formatRelativeTime(createdAt)`. Empty if the list is empty.
  4. **Quick actions** — three `QuickAction` tiles (reuse the pattern from artist dashboard): Edit convention / Create event / Manage lists, each with icon + label + description + correct href.
  5. **All events list** — the existing card-per-event list is preserved below quick actions.
- `__tests__/components/organizer-dashboard-view.test.tsx` — new. Cases:
  - Renders hero with firstName + conventionName.
  - `currentEvent` populated → card shows name, date, status badge, three counts.
  - `currentEvent === null` → empty state with "Create event" CTA visible; no unread chip.
  - Messages widget: renders N announcements when N ≤ 3; zero-state hidden.
  - Events list: renders every event from the `events` prop.

**Approach:** Mirror the artist dashboard's visual hierarchy (`max-w-6xl space-y-12 px-6 py-10`) and the `QuickAction` tile pattern. Reuse `ORGANIZER_STATUS_LABELS` for the status badge. Use `Link`-wrapped `Card interactive` for the all-events list items.

**Verification:** Component test green; build green.
**Depends on:** none (pure view, test with fixtures).

### 7. Wire the dashboard page

Rewrite the server page to fan out data fetching in parallel and mount the view component.

**Requirements:** REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7.

**Files:**
- `src/app/(authenticated)/conventions/manage/page.tsx` — rewrite:
  - Keep the auth gate (`role === "organizer"`) + convention resolution via `getOrganizerConvention`.
  - Add a `Promise.all` pattern that runs in parallel:
    1. `getCurrentEventForConvention(convention.id)`
    2. `getRecentAnnouncementsForConvention(convention.id, 3)`
    3. `db.select(...).from(events).where(conventionId).orderBy(desc(createdAt))` — the existing all-events list
    4. Profile lookup to derive `firstName`.
  - If the current event exists, run a follow-up parallel fetch for its `getApplicationCounts` + `getUnreadThreadCountForEvent`. Use a second `Promise.all` to keep latency flat.
  - Assemble the props for `<OrganizerDashboardView>`. Serialize `Date` fields to the shape the view expects.
  - Remove the existing inline markup; render `<OrganizerDashboardView {...props} />`.

**Approach:** Two-stage parallel fetch — stage 1 runs in parallel regardless; stage 2 (event-scoped) only runs if stage 1 returned a current event. Everything else already exists in helpers.

**Verification:** Manual sanity: visit `/conventions/manage` as an organizer — see the new dashboard. Browse to "All events" card links, confirm navigation still works. `npm run build` green; full test suite green.

**Depends on:** 2, 3, 4, 5, 6.

### 8. De-duplicate `ORGANIZER_NAV`

**Requirements:** REQ-8.

**Files:**
- `src/components/layout/auth-sidebar-nav.tsx` — remove the second entry (`Conventions`) from `ORGANIZER_NAV`. Keep only `Overview` → `/conventions/manage` with `LayoutDashboard` icon.
- `__tests__/components/auth-sidebar-nav.test.tsx` — update if it asserted exactly N items in the organizer nav.

**Approach:** Trivial array edit; update tests if they explicitly count items.

**Verification:** `npm test -- auth-sidebar-nav` green; manual: organizer sidebar shows one Overview entry (not two).

**Depends on:** none (but logically ships with or after task 7).

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (login redirect) | 1 |
| REQ-2 (welcome hero + convention name) | 6, 7 |
| REQ-3 (current event, empty state) | 5, 6, 7 |
| REQ-4 (current-event card content) | 2, 3, 6, 7 |
| REQ-5 (messages widget) | 4, 6, 7 |
| REQ-6 (quick actions) | 6, 7 |
| REQ-7 (all-events list preserved) | 6, 7 |
| REQ-8 (nav de-dup) | 8 |

## Risks

- **Thread-unread subquery portability** — the "latest author per thread" subquery needs to run in a single SQL round-trip. Drizzle's `sql` helper and correlated subqueries both work on Postgres; test with the real DB (integration test, not mocks) to catch syntax issues.
- **`current_date` vs JS `Date`** — `events.event_start_date` is a `date` column (day-precision). Comparing against `current_date` is timezone-sensitive; in practice the app runs in a single timezone and a date-only comparison is correct. Integration tests should pin the timezone via `TZ=` env var in test setup if not already pinned.
- **Dashboard load time if a convention has many events** — the all-events list is unbounded. Current organizers have single-digit events so not a concern; if it ever grows past 50, add pagination or a "past events" collapse.
- **Login test coverage** — task 1's redirect change must be mirrored in the integration test; otherwise existing test will fail against the new redirect. The task explicitly includes the test update to avoid that.
- **Nav test coverage** — if an existing test counts `ORGANIZER_NAV` length, task 8 needs to update it. Task 8 explicitly mentions this.
