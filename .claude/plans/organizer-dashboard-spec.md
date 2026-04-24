# Organizer dashboard

## Problem Statement
After login, organizers land on the public `/conventions` directory (a bug), and `/conventions/manage` is a thin events-list without any operational overview. With applications, Q&A threads, and announcements now live, organizers need a single landing surface that answers "what's the state of my current event, what needs my attention, and what shall I do next?" at a glance.

## Requirements
- **REQ-1** After login, an organizer lands on `/conventions/manage`. (Today it sends them to the public directory.)
- **REQ-2** `/conventions/manage` shows a welcome hero with the organizer's first name and an inline link to edit convention info.
- **REQ-3** The dashboard surfaces **one "current event"**: the event with the nearest `eventStartDate` that's today or in the future. If no event matches, the slot shows an empty state with a `Create event` CTA.
- **REQ-4** The current-event card displays: event name, date range, organizer-facing status badge, application counts (total received, accepted), and an **unread Q&A thread count** (threads where the latest message is from an artist AND `lastMessageAt > organizerLastReadAt`). It links through to the event management page and to the applications review page.
- **REQ-5** A **messages widget** shows a small digest: the unread Q&A thread count (as above) plus the **3 most recent announcements** the organizer has posted across any event, each with subject, event name, and relative timestamp.
- **REQ-6** Quick-action tiles for the most common next moves: Edit convention, Create event, Manage lists.
- **REQ-7** Below the overview, the existing all-events list is preserved — one card per event with status badge — so the organizer can still reach older or future events in one click.
- **REQ-8** The sidebar nav's organizer section is de-duplicated (one `Overview` entry pointing at `/conventions/manage`; no second entry pointing at the same URL).

## Scope

### In Scope
- New dashboard layout at `/conventions/manage` replacing the current page.
- Login-redirect fix for the `organizer` role.
- New query helper aggregating unread Q&A thread counts across every event in the organizer's convention.
- New query helper returning the most recent N announcements across every event in the organizer's convention.
- Nav de-duplication.
- Reuse of existing `ORGANIZER_STATUS_LABELS`, date formatters, and the status badge component.

### Out of Scope
- A new route or URL structure (we're replacing in place).
- Manually pinning a "featured" event (no new DB flag).
- A dashboard for artists (already exists).
- Multi-convention-per-organizer support — current invariant is 1:1.
- Application-status trend graphs, sparklines, or time-series widgets.
- Push/email summary of dashboard contents.
- Any mutation surface on the dashboard beyond the existing CTAs.

## Acceptance Criteria

- [ ] Logging in as an organizer lands on `/conventions/manage`, not the public `/conventions` directory.
- [ ] `/conventions/manage` shows the welcome hero with the organizer's first name + convention name + edit-convention link.
- [ ] When at least one event has `eventStartDate >= today`, the dashboard features the nearest one in a "Current event" card with name, date range, status badge, application counts, and an unread-thread count.
- [ ] When no event meets the "nearest upcoming / ongoing" rule, the slot shows a "No upcoming event" empty state with a `Create event` CTA.
- [ ] The messages widget renders the unread-thread count + up to 3 most recent announcements with subject, event name, and relative timestamp.
- [ ] The quick-action tiles (Edit convention, Create event, Manage lists) navigate to the correct pre-existing routes.
- [ ] The all-events list is still reachable from the dashboard (one card per event, most recent first).
- [ ] The sidebar no longer has two entries both pointing at `/conventions/manage`.

## Constraints
- One organizer = one convention (current DB invariant).
- Reuse `ORGANIZER_STATUS_LABELS`, `formatDateRangeNo`, `formatRelativeTime`, and existing badge variants.
- Cross-event aggregation queries must be cheap — no N+1 over events (we just cleaned one of those up on the inbox).
