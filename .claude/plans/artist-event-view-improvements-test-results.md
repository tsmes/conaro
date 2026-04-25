# Test Results: Artist event view improvements

Date: 2026-04-25
Plan: `.claude/plans/artist-event-view-improvements-plan.md`
Spec: `.claude/plans/artist-event-view-improvements-spec.md`
Status: **PARTIAL PASS** — server-side routing and tab gating verified; the visual / interactive criteria (status-card differentiation, stronger highlight, pulse animation, in-app navigation between tabs) require human-eye verification in a browser. `agent-browser` is not installed on this machine, so curl was used for everything that's HTTP-visible.

## Summary

The dev server (`npm run dev` on `localhost:3000`) was already running. Verified the routing and tab-gating layer end-to-end via `curl` against the seeded events. All five test events behaved correctly: the one with a published floor plan exposes the Floor plan sub-route and surfaces the tab in the layout; the rest hide both the Floor plan and Messages routes. The Messages route returns 404 for non-accepted users on every event tested. All 485 unit/integration tests still pass (`npm test`).

## Results

### Routing & tab gating (acceptance criteria 1, 2, partial 3, 9)

Tested using these seeded events:
- `2838c2e3-f72a-4b8f-9117-f4ac888cc0d8` — has a published floor plan
- `15f7b0d5-54ec-4921-9c77-628b3aec8d06`, `4d586118-…`, `b8e58625-…`, `ce646dad-…`, `e28c00d1-…` — no floor plan / not published-with-plan

- [x] **AC1 — Logged-out viewer on event WITH floor plan sees Details + Floor plan only.** `curl /events/{id-with-plan}` HTML contains only `/events/{id}` and `/events/{id}/floor-plan` links inside the tab nav; no `/messages` link.
- [x] **AC1 — Logged-out viewer on event WITHOUT floor plan sees no tab nav at all.** The single-tab early-return in `ArtistEventTabsNav` correctly returns null; the nav element with `class="flex gap-1 border-b border-border"` is not rendered (`grep -c` returned 0).
- [x] **AC2 — Floor plan sub-route returns 200 for the published-with-plan event** (logged-out request). 404 for the five events without plans, including via direct URL.
- [x] **AC3 (partial) — Messages sub-route returns 404 for logged-out / non-accepted viewers.** Cannot fully verify "appears only for the accepted artist with a thread" without authenticated browser session — flagged below.
- [x] **AC7 (partial) — Floor plan sub-route accepts `?focus=table` query param without erroring.** Returns 200. The pulse animation itself runs client-side and cannot be observed via curl — flagged below.
- [x] **AC9 — Apply card is present on Details tab.** HTML contains "Apply" / "Log in" / "register" CTAs on accepting events, exactly as before.

### Tests + types

- [x] `npx tsc --noEmit` — 0 errors.
- [x] `npm test` — 485/485 passing, including the new `ApplicationStatusCard` render tests (5 cases) and the updated notifications integration test confirming the thread-message link points to `/events/{id}/messages`.

## Items requiring human-eye verification

These cannot be exercised by curl. Please run through them in a browser:

### Status card visual differentiation (AC4, AC5)

Sign in as an artist whose application is in each terminal state on the same event (or distinct events). Confirm:

- **Accepted:** emerald-tinted card, `CheckCircle2` icon, header reads "You're in".
- **Rejected:** muted neutral card (NOT destructive red), `Info` icon, header reads "Results".
- **Waitlisted:** amber-tinted card, `Hourglass` icon, header reads "You're on the waitlist".
- The status card sits *above* the tab bar and stays visible after navigating from Details → Floor plan → Messages.

### Floor plan highlight + Show me my table (AC6, AC7, AC8)

Sign in as an accepted artist on `2838c2e3-…`. From the Details tab status card:

- "Show me my table" button is visible (only when artist's application is assigned to a table).
- Clicking it navigates to `/events/{id}/floor-plan?focus=table` and the artist's table briefly pulses for ~2 s, then settles back to the strong static highlight.
- The static highlight (4 px purple stroke + halo opacity 0.35) is clearly more prominent than other assigned tables (1.5 px blue stroke).
- Visit `/events/{id}/floor-plan` directly (no `?focus`) — no pulse, just the static highlight.

### Messages tab (AC3, AC10)

- Sign in as the accepted artist for an event where they have a thread; confirm the Messages tab appears in the nav.
- Sign in as a *different* accepted artist on the same event — Messages tab should NOT appear (each artist has their own thread).
- Trigger a `thread_message_from_organizer` notification and confirm the in-app notification deep-link lands on `/events/{id}/messages`, not on Details.

## Notes

- `agent-browser` is not installed on this machine (`which agent-browser` → not found). If you want me to drive the browser checks, install it via `npm i -g agent-browser` (or whatever the project uses) and re-invoke the manual-testing skill.
- The follow-button bug fix (commit `2d6d318d`) was tested in a previous step and is not part of this acceptance run.
- All assertions above were generated from raw curl output against the running dev server; no test fixtures were faked.
