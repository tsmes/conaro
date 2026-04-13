# Phase 7 — Event Lifecycle Automation

## Problem Statement

Event publishing and application periods are currently fully manual — organizers click "Open Applications" whenever they want. There's no visibility for artists between event creation and applications opening. Phase 7 introduces a `published` status so events become visible before applications open, and adds cron-driven automatic transitions based on the organizer-set dates. Organizers can still manually open or close applications as an override. Followers get notified both when events are published and when applications actually open.

## Requirements

- [REQ-1] Event status enum gains a new value `published` between `draft` and `accepting_applications`
- [REQ-2] Organizers can publish an event (draft → published) via a "Publish Event" action on the event detail page
- [REQ-3] Publishing an event requires both `applicationOpenDate` and `applicationCloseDate` to be set
- [REQ-4] Published events are visible to artists on the events listing and convention detail pages
- [REQ-5] Draft events remain hidden from artists
- [REQ-6] A cron endpoint transitions events: `published` → `accepting_applications` when `applicationOpenDate` has been reached (UTC)
- [REQ-7] The same cron transitions `accepting_applications` → `reviewing` when `applicationCloseDate` has passed (UTC)
- [REQ-8] The cron endpoint is idempotent and safe to call repeatedly
- [REQ-9] The cron endpoint is protected by a shared secret (environment variable)
- [REQ-10] Organizers can manually open applications (published → accepting_applications) before the scheduled date
- [REQ-11] Organizers can manually close applications (accepting_applications → reviewing) before the scheduled date
- [REQ-12] New notification type `event_published` (schema enum addition)
- [REQ-13] When an event is published: followers receive `event_published` notification, and "any new event" subscribers receive `new_event` notification
- [REQ-14] When applications open (either via cron or manual): followers receive `event_opened` notification
- [REQ-15] Artists can toggle email for `event_published` in notification preferences

## Scope

### In Scope

- Add `published` to event_status enum (migration)
- Add `event_published` to notification_type enum (migration)
- Rename/replace "Open Applications" button with "Publish Event" for draft events
- New "Publish Event" server action with validation (dates required)
- Keep manual "Open Applications" action — now transitions `published → accepting_applications`
- Keep manual "Close Applications" action — transitions `accepting_applications → reviewing`
- Cron endpoint `/api/cron/events/tick` protected by shared secret
- Cron logic: transition events based on UTC dates
- Make published events visible on `/events`, `/conventions/[id]`, and event detail page
- Notify followers + any-new-event subscribers on publish
- Notify followers on applications opening (manual OR cron-triggered)
- Update notification preferences UI with new `event_published` toggle
- Update STATUS_LABELS across organizer UI

### Out of Scope

- Time-of-day precision for application dates (date-only retained)
- Timezone-aware scheduling (UTC only)
- Automatic cron trigger for `reviewing → results_published` (manual publish remains)
- Automatic cron trigger for `draft → published` (manual only)
- Retry logic for failed cron transitions (idempotent endpoint handles duplicate runs)
- Analytics/logging dashboard for cron runs
- Scheduling UI previewing "will open on X"

## Acceptance Criteria

**Event Lifecycle**
- [ ] Event status enum includes `draft`, `published`, `accepting_applications`, `reviewing`, `results_published`
- [ ] Organizer sees "Publish Event" button on the event detail page when status is `draft`
- [ ] Attempting to publish without both dates shows a clear error
- [ ] Published event shows up on `/events` for artists
- [ ] Published event shows up on the convention detail page's "Open Events" (or similar) section
- [ ] Draft events remain hidden from artists on both pages

**Manual Overrides**
- [ ] Organizer sees "Open Applications Now" button when event status is `published` (manual override)
- [ ] Organizer sees "Close Applications Now" button when event status is `accepting_applications` (manual override)
- [ ] Manual open transitions to `accepting_applications` and fires follower notifications
- [ ] Manual close transitions to `reviewing`

**Cron Transitions**
- [ ] Hitting the cron endpoint without the shared secret returns 401
- [ ] Hitting the cron endpoint with correct secret runs the transitions
- [ ] Cron transitions `published` events to `accepting_applications` when `applicationOpenDate <= today (UTC)`
- [ ] Cron transitions `accepting_applications` events to `reviewing` when `applicationCloseDate < today (UTC)` (i.e., the close date has fully passed)
- [ ] Running the cron multiple times in a row is safe (no duplicate notifications, no errors)
- [ ] Cron-triggered application opening fires follower notifications

**Notifications**
- [ ] Publishing an event creates `event_published` notifications for all convention followers
- [ ] Publishing an event creates `new_event` notifications for artists with that preference enabled (non-followers)
- [ ] Applications opening (manual or cron) creates `event_opened` notifications for followers
- [ ] Followers don't receive duplicate `new_event` notifications on publish (dedup)
- [ ] Email preferences page shows a toggle for `event_published` (for artists)

## Constraints

- Cron endpoint uses a shared secret from env (e.g., `CRON_SECRET`) validated against a header like `Authorization: Bearer <secret>`
- Cron compares dates using UTC to avoid timezone ambiguity
- `applicationOpenDate <= today` means open on or after that day; `applicationCloseDate < today` means close has passed (close date is inclusive — last day applications are open)
