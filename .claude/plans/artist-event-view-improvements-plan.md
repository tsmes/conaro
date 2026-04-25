# Implementation Plan: Artist event view improvements

Spec: `.claude/plans/artist-event-view-improvements-spec.md`

## Technical Decisions
- **Server-routed sub-pages with shared `layout.tsx`** — mirrors organizer pattern; URLs stay shareable; status card + tabs nav rendered once in layout, child pages render only their tab content.
- **`ApplicationStatusCard` extracted as standalone component** — per-outcome visual treatment lives in one place; testable in isolation; same component is used regardless of which tab is active.
- **Pulse via Konva tween, not CSS overlay** — react-konva idiomatic; avoids stacking a DOM layer over the canvas with positional calc.
- **`?focus=table` query param triggers pulse** — clean, shareable, and lets the Floor plan page stay a server component reading `searchParams`.
- **Notification retarget for thread messages, no migration of stored links** — old in-app notifications with `#thread` will land on the Details tab and the user clicks Messages. Acceptable one-time degradation; not worth a backfill.

## Tasks

> **Status:** All 5 tasks implemented and committed (commits `2527297f`, `aa5abe0f`, `f85c61a8`, `252a7756`, `dce53eee`). Code review and manual testing pending.

### 1. ✅ Strengthen the static own-table highlight on the floor plan
Make the artist's own assigned table visibly more prominent in `FloorPlanCanvas`. This is a static change that benefits anyone viewing the plan, including before any "Show me my table" interaction is added.

**Requirements:** REQ-6

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx` — bump highlighted strokeWidth (currently 2.5 at line 360) to 4; expand halo Rect (lines 317–326) inset from 6 → 8 px and fill opacity from 0.15 → 0.35.

**Approach:**
- Edit only the highlighted-table branches; assigned/unassigned visuals untouched.
- Sanity-check that the halo render order still places it under the body Rect.

**Verification:** `npm test` passes; visually inspect a published event's floor plan as the assigned artist (stronger purple stroke + halo) and as a non-assigned viewer (unchanged blue).

**Depends on:** none

---

### 2. ✅ Extract `ApplicationStatusCard` with per-outcome visual treatment
Replace the inline status card branching at `page.tsx:340–422` with a dedicated presentational component, and apply the differentiated treatment from REQ-3 (emerald / muted neutral / amber).

**Requirements:** REQ-3

**Files:**
- `src/components/events/application-status-card.tsx` — new. Props: `status`, `responseMessage`, `eventId`, `waitlistEnabled`, `children` slot for `EventThread` / `JoinWaitlistButton`. Renders one of four variants: `accepted` (emerald background tint, emerald accent border, `CheckCircle2` icon, "You're in"), `rejected` (muted neutral card, `Info` icon, "Results"), `waitlisted` (amber tint, amber accent, `Hourglass` icon, "You're on the waitlist"), `default` (current `SectionCard` styling, "Your application").
- `src/app/(public)/events/[eventId]/page.tsx` — replace the inline status card block with `<ApplicationStatusCard ...>` wrapping the existing thread / waitlist / response-message JSX as children.
- `__tests__/components/application-status-card.test.tsx` — new. Render-tests one case per variant: confirm header text, icon presence (via accessible name or test-id), and that the children slot renders.

**Approach:**
- Use Tailwind utilities for tint backgrounds (`bg-emerald-50 dark:bg-emerald-950/30` etc.). Keep the markdown-content wrapper styling identical to today.
- Don't move the "Show me my table" button into this task — task 4.
- The component should not own the data-fetching for thread / waitlist; it accepts those rendered nodes as children.

**Verification:** `npm test` passes (new test file plus existing). Manually open an event in each of accepted, rejected, waitlisted, and submitted states; confirm visual differentiation.

**Depends on:** none

---

### 3. ✅ Split the artist event page into Details / Floor plan / Messages tabs
Introduce the routed tab structure: a shared `layout.tsx` that renders header + status card + tabs nav, and three sub-pages each owning their data fetch. The existing `/events/[eventId]` URL stays valid as the Details tab.

**Requirements:** REQ-1, REQ-2, REQ-4, REQ-5

**Files:**
- `src/app/(public)/events/[eventId]/layout.tsx` — new. Server component. Fetches: event + convention join, session, follow status, ownApplicationStatus / ownApplicationId / ownResponseMessage / ownAssignedTableId, plus two tab-availability flags (`hasFloorPlan` from `events.floor_plan IS NOT NULL`, `hasThread` via `getThreadForArtist` count). Renders back-link, header, `<ApplicationStatusCard>`, `<ArtistEventTabsNav>`, then `{children}`.
- `src/components/events/artist-event-tabs-nav.tsx` — new. Mirrors `EventTabsNav` shape: client component with `usePathname`, `Link`-based pills. Tabs: Details (always), Floor plan (when `hasFloorPlan && event.status === "results_published"`), Messages (when `hasThread`). Hidden — not disabled — when not applicable.
- `src/app/(public)/events/[eventId]/page.tsx` — modify. Becomes the Details tab. Removes header/back-link/status-card/announcement blocks (now in layout) and removes the inline floor plan section. Keeps: about / dates / location / artist logistics / amenities / convention description / apply form.
- `src/app/(public)/events/[eventId]/floor-plan/page.tsx` — new. Server component. Fetches `getFloorPlanForEvent`. Renders `<PublicFloorPlanView>` only.
- `src/app/(public)/events/[eventId]/messages/page.tsx` — new. Server component. Fetches `getThreadForArtist`. Renders `<EventThread>`. Returns `notFound()` if not the accepted artist.
- `src/lib/events/event-context.ts` (or similar) — new. Tiny helper that fetches the layout-shared bag (event + ownership flags) so layout and child pages can call it cheaply; React's `cache()` wrapper for request-scoped dedupe.

**Approach:**
- Wrap shared queries in `cache()` so layout and child pages don't double-fetch.
- Move the announcement-banner JSX into the layout, gated on `isAcceptedToEvent` (today's behavior preserved).
- The status card moves into the layout but its data comes from the same shared cache wrapper.
- For `/floor-plan` and `/messages`, gate access in the page itself: floor-plan page returns `notFound()` if no plan or event not published; messages page returns `notFound()` if no thread for current user. Layout still hides the tab in nav, but pages defend independently.
- Handles REQ-8 implicitly: floor plan page renders the canvas as its first content, so the canvas is in view on arrival without scrolling.

**Verification:** `npm test` (no new unit tests required for routing — verified manually). Manually:
- Logged-out user visits `/events/[eventId]` → only Details tab visible.
- Artist with no application visits → only Details.
- Accepted artist on a published event with plan + thread → all three tabs visible; status card appears above tabs on every tab.
- Direct visit to `/floor-plan` for unpublished event → 404.
- Direct visit to `/messages` as a non-accepted user → 404.

**Depends on:** task 2 (status card component is rendered by layout)

---

### 4. ✅ "Show me my table" button + pulse animation
Add the button to `ApplicationStatusCard` (when accepted + table assigned), and wire a 2-second pulse on the artist's table when the Floor plan tab is loaded with `?focus=table`.

**Requirements:** REQ-7, REQ-8

**Files:**
- `src/components/events/application-status-card.tsx` — modify. Accept new props `eventId`, `hasAssignedTable`. When `status === "accepted" && hasAssignedTable`, render a `<Link href={`/events/${eventId}/floor-plan?focus=table`}>` styled as a button.
- `src/app/(public)/events/[eventId]/layout.tsx` — modify. Pass `hasAssignedTable` (computed from layout's existing data) to `ApplicationStatusCard`.
- `src/app/(public)/events/[eventId]/floor-plan/page.tsx` — modify. Read `searchParams.focus`; pass `pulseHighlight={searchParams.focus === "table"}` to `PublicFloorPlanView`.
- `src/components/floor-plans/public-floor-plan-view.tsx` — modify. Accept `pulseHighlight` prop, forward to `FloorPlanCanvasDynamic`.
- `src/components/floor-plans/floor-plan-canvas.tsx` — modify. Accept `pulseHighlight` prop. When `pulseHighlight && highlight`, in a `useEffect` keyed on `(table.id, pulseHighlight)`, attach a Konva `Tween` to the halo Rect ref that animates `opacity` and `scale` for ~2 s (e.g. opacity 0.35 → 0.7 → 0.35 over two cycles), then leave the Rect at the static post-task-1 highlight values.

**Approach:**
- Use `useRef<Konva.Rect>(null)` on the halo Rect; attach via `ref`. Konva `Tween` is the canonical react-konva way; it cleans up on `tween.destroy()` in the effect cleanup.
- Single tween chained as one yo-yo cycle, or `Tween` with `easing` + reverse and a setTimeout to settle. Keep the implementation small — under 30 LOC.
- Skip the tween entirely when `!pulseHighlight || !highlight`.
- Default `pulseHighlight` to `false` in props so the editor and other call sites are unaffected.

**Verification:** `npm test`. Manually: as accepted artist, click "Show me my table" on Details tab → URL changes to `/floor-plan?focus=table`, table pulses for ~2 s then settles. Direct visit to `/floor-plan` (no `?focus`) → no pulse. As non-assigned viewer with `?focus=table` → no pulse (their highlight prop is null).

**Depends on:** tasks 1 and 3

---

### 5. ✅ Retarget thread-message notification to the Messages tab
Update the in-app notification builder so organizer→artist thread replies link directly to `/messages` instead of the legacy `#thread` fragment. Drop the now-redundant `id="thread"` anchor in `EventThread`.

**Requirements:** Infrastructure (covers spec's "update notification deep-links" in scope)

**Files:**
- `src/lib/notifications/triggers.ts` — modify line 159. Change `link: `/events/${eventId}#thread`` to `link: `/events/${eventId}/messages``.
- `src/components/events/event-thread.tsx` — modify line 54. Remove `id="thread"` and the `scroll-mt-20` (no longer needed).
- Any existing test for `triggers.ts` asserting the URL — locate and update.

**Approach:**
- One-line link change.
- Search for `id="thread"` and `#thread` in the codebase to confirm no other consumers.

**Verification:** `npm test` (any updated assertion passes). Manually trigger a thread reply as organizer and click the resulting in-app notification → lands on the Messages tab.

**Depends on:** task 3 (Messages route must exist)

## Requirements Coverage
| Requirement | Task(s) |
|---|---|
| REQ-1 (tab structure) | 3 |
| REQ-2 (status card pinned above tabs) | 3 |
| REQ-3 (per-outcome visual differentiation) | 2 |
| REQ-4 (apply form stays inline) | 3 |
| REQ-5 (public viewer tab logic) | 3 |
| REQ-6 (stronger own-table highlight) | 1 |
| REQ-7 ("Show me my table" + pulse) | 4 |
| REQ-8 (table in view on arrival) | 3 (implicit via tab structure), 4 (validated end-to-end) |

## Risks
- **Konva tween lifecycle.** If the tween fights React's render cycle or Strict Mode double-invocation, fall back to a CSS-keyframed div positioned over the table. Fallback is small.
- **`cache()` semantics in layout + child pages.** If layout and child pages duplicate fetches in a way that violates request-scoped dedup expectations, the cost is doubled queries on each tab — functional, just slightly wasteful. Worth measuring once.
- **Old notifications still in DB** point at `#thread`. After task 5 the link still works (lands on Details) but doesn't auto-scroll to the thread. Acceptable per discussion in decisions section.
