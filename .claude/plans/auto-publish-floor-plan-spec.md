# Auto-publish floor plan

## Problem Statement

Today the floor plan is visible to artists and the public the moment results are published. Organizers may want a beat between announcing results and revealing the layout — to communicate with accepted artists, lock in last-minute changes, or keep the floor plan as a "day-of" reveal. Decoupling the two also lets organizers schedule the publish for a sensible default (e.g., one day before the event) without having to remember to do it manually. Separately, the organizer-side floor-plan editor currently 404s unless results are published, which prevents organizers from laying out tables during the `reviewing` phase — a pre-existing bug we'll fix as part of this work.

## Requirements

- [REQ-1] An event has a separate "floor plan public" state that is independent from `event.status`. When this state is "not public", neither the public nor accepted artists can reach the floor-plan tab.
- [REQ-2] Floor plan can only become public after the event's results have been published (`event.status === "results_published"`). Earlier transitions are blocked in both manual and auto-publish paths.
- [REQ-3] On the organizer's floor-plan editor page, a new section shows: current public state + timestamp ("Public since [date]" or "Not public yet"), a "Publish now" / "Unpublish" button, and an "Auto-publish [N] days before event" setting (toggle + days-before number).
- [REQ-4] Manual "Publish now" sets the public state immediately. "Unpublish" reverses it.
- [REQ-5] Auto-publish setting accepts a positive integer `daysBefore`. When set, the cron job publishes the floor plan once the date `eventStartDate − daysBefore` is reached, provided results are already published.
- [REQ-6] Auto-publish fires at most once per event. After firing, the auto-publish setting is consumed (cleared); the organizer can re-enable it if needed.
- [REQ-7] Floor-plan-tab visibility, the "Show me my table" button, and the public floor-plan page all switch to depend on the new flag instead of `event.status`.
- [REQ-8] Existing events (created before this feature) default to "not public" with auto-publish off. Organizers must manually publish them.
- [REQ-9] Organizers can open the floor-plan editor page for any event they own, regardless of `event.status`. The current pre-publish 404 is removed.

## Scope

### In Scope

- New schema columns on `events`: a "publicly published at" timestamp + a "auto-publish days before" nullable integer.
- New manual publish / unpublish server action(s).
- A new cron transition in the existing `/api/cron/events/tick` handler.
- New section on the organizer floor-plan editor page (`/conventions/manage/events/[eventId]/floor-plan`).
- Removal of the `results_published`-only gate on the organizer-side floor-plan editor page (REQ-9).
- Migration of all four existing `results_published` floor-plan gates (public page, organizer-side viewer paths, tab nav, status-card "your table" check) to the new flag.

### Out of Scope

- Notifying artists when the floor plan is published.
- Email digests or reminders about upcoming auto-publishes.
- Per-artist visibility (e.g., "show only your row" while floor plan is private).
- Hiding artist names on tables before publish — assignments and the plan are revealed together.
- Backfilling existing `results_published` events to "floor plan public" state.

## Acceptance Criteria

- [ ] On a fresh event with results just published, the public `/events/[id]/floor-plan` route 404s, the floor-plan tab is hidden, and the "Show me my table" button doesn't appear on the accepted-artist status card.
- [ ] After the organizer clicks "Publish now", the floor-plan tab appears for accepted artists *and* logged-out viewers, and the public floor-plan page returns 200.
- [ ] Clicking "Unpublish" reverses everything — floor plan tab disappears, page 404s again.
- [ ] Setting auto-publish to 3 days before an event whose start date is in 5 days does *not* cause an immediate publish; setting it on an event whose start is in 2 days causes the next cron tick to publish.
- [ ] Auto-publish does not fire for events still in `accepting_applications` or `reviewing` — even if the lead-time threshold has passed.
- [ ] Once auto-publish fires, the auto-publish-days-before setting is cleared on that event; subsequent un-publishes do not re-trigger auto-publish.
- [ ] "Publish now" is disabled (with a tooltip explaining why) when `event.status !== "results_published"`.
- [ ] Organizer can open the floor-plan editor page for an event in `draft`, `published`, `accepting_applications`, `reviewing`, or `results_published` — no 404.

## Constraints

- Cron tick endpoint is already authenticated via `CRON_SECRET` bearer header — must reuse, no new auth surface.
- The four existing floor-plan visibility gates currently coupled to `results_published` must all switch in the same change to avoid a half-state where some viewers can see the plan and others can't.
