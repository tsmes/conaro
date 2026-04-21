# Landing Page Redesign

## Problem Statement

The current homepage at `/` is a generic marketing splash (hero + two CTA cards + 3-step explainer + final CTA) that tells visitors what Conaro is but shows nothing about what's actually happening on the platform. The conaro design bundle (`Dashboard.html`) reframes the homepage around the question "what's coming up?" — the events list itself becomes the value proposition, with artist-specific context layered in when the viewer is signed in as an artist. This delivers the same pitch implicitly while giving returning users immediate utility.

## Requirements

### Data & routing

- [REQ-1] The `/` route renders the new events-first landing page for all viewers (signed-out, signed-in artist, signed-in organizer).
- [REQ-2] The existing `/events` directory page remains unchanged.
- [REQ-3] Events shown on the landing page are non-draft events from the database, sorted by `event_start_date` ascending.
- [REQ-4] Each event card shows data joined from its parent convention (name, logo) — no N+1 queries.

### Viewer modes

- [REQ-5] Three viewer modes are supported:
  - **Public** — signed-out viewer; also used for signed-in organizers.
  - **Artist** — signed-in with `role === "artist"`.
- [REQ-6] The two modes differ only in: topbar actions, filter-chip options, event-card artist-context strip, featured-hero status badges, and which right-rail is shown. The core event list layout is identical.

### Topbar

- [REQ-7] Sticky topbar with Conaro wordmark, primary nav, search affordance, notifications bell (signed-in only), theme toggle, and auth/avatar controls — reusing the existing `PublicShell` header where it fits.
- [REQ-8] Signed-out and organizer viewers see "Log in" + "Register" (existing behaviour). Artists see the avatar menu (existing behaviour).

### Page header + filters

- [REQ-9] Page header with a heading ("What's coming up"), a short subhead (role-aware copy), and a segmented filter control.
- [REQ-10] Artist filters: **All events**, **Following**, **Open to apply**, **My applications**.
  - _Following_ = events whose convention the artist follows (`convention_follows`).
  - _Open to apply_ = events with `status = 'accepting_applications'` whose `application_close_date` is in the future.
  - _My applications_ = events the artist has an application row for (any status).
- [REQ-11] Public filters: **All upcoming**, **Next 3 months**, **By country**.
  - _Next 3 months_ = events with `event_start_date` within 92 days from today.
  - _By country_ expands a row of chips built from distinct `venue_country` values present in the current event set, plus an "All" chip. Selecting a chip filters the list to that country.

### Featured hero

- [REQ-12] Above the list, a featured-hero card renders the first event in the currently-filtered list (the soonest upcoming event).
- [REQ-13] The hero shows: the convention's cover treatment (logo if available, else deterministic gradient) with convention name + event name + date range, a large countdown ("Starts in N days"), a venue line (venue name, city, country), and a single primary CTA ("View event") linking to `/events/{id}`.
- [REQ-14] On the artist view, if the artist has an application for the featured event, an artist-status badge appears in the hero (Accepted / Under review / Submitted / Not selected).
- [REQ-15] If the filtered list is empty, no featured hero is shown and the list area displays an empty state with a "Browse directory" link to `/events`.

### Event cards

- [REQ-16] Each event card has a left cover rail with a date stamp (month abbreviation + day) and a convention avatar.
  - The cover rail uses the convention's uploaded `logoPath` as the background when set.
  - When no logo is set, the rail uses one of six preset gradients (`cover-a` … `cover-f`) chosen deterministically from the convention id. The convention's initials appear as a small avatar.
- [REQ-17] The card body shows: convention name, event name, date range, venue city + country, and for artists: a follow/status badge row.
- [REQ-18] On the artist view, when the artist has a relationship with the event (application in any state, or the event is an open call to any followed convention), a **context strip** appears inline with a primary-container background colour and a contextual message:
  - `accepted` → "You're in the show. View details."
  - `under_review` → "Your application is under review."
  - `submitted` → "Application sent. Applications close in Nd."
  - `rejected` → "Not selected this year."
  - _open call & no application_ → "Open call · Apply now."
- [REQ-19] Card footer actions:
  - Public view: "View event".
  - Artist, open-call, no application: "View event" + "Apply".
  - Artist, application exists: "View event" + "View application".
  - Artist, any event: a "Follow" toggle when the convention is not yet followed.
- [REQ-20] Cards link to `/events/{id}` as their primary target (the card surface is clickable; action buttons do not double-trigger navigation).

### Right rail

- [REQ-21] Public right rail (signed-out / organizer) contains three stacked cards:
  - **Brand CTA card** — "I'm an artist" → `/register/artist`, "I'm an organizer" → `/register/organizer`. When the viewer is a signed-in organizer, the card instead shows "Manage conventions" → `/conventions/manage`.
  - **Jump to month** — list of month buckets (label + count) grouped from the currently filtered events.
  - **Browse by region** — static chips for Norway, Sweden, Denmark, Finland, Iceland, and a catch-all "Nordics" that clears the filter. Clicking a chip applies the country filter used by REQ-11.
- [REQ-22] Artist right rail contains three stacked cards:
  - **Quick status** — counts of Applications (total), Accepted, In review (under_review), Following.
  - **Profile completeness** — reuses `computeCompleteness` from `src/lib/profile/completeness.ts`; shows percentage, a progress bar, and the missing-item checklist.
  - **Notifications** — the 3 most recent notifications (type icon, title, body, relative time, unread pip). "Mark all read" and "See all" link to `/notifications`.

### Theming & responsiveness

- [REQ-23] The page renders correctly in both light and dark mode using the existing CSS variables in `globals.css`. No new theme toggle is introduced.
- [REQ-24] Layout is responsive: at `xl` and above, the rail sits in a right column; below `xl`, the rail stacks beneath the event list. The cover rail on event cards hides on `sm` and below, with the date stamp moving into the card body.

### Marketing copy

- [REQ-25] The previous marketing homepage (`HomepageView`, `ctaForRole`, `StepRow`) is removed. The page component `src/app/(public)/page.tsx` renders the new landing view directly.

## Scope

### In Scope

- Replacing `/` with the events-first landing page for all viewer modes.
- New components for the landing page (featured hero, event card, two right rails, page header with filters).
- Data fetching: events + conventions join, plus artist-scoped additions (follows, applications, notifications, profile completeness) when signed in as an artist.
- Deterministic cover-gradient helper keyed by convention id.
- Deletion of the now-unused `HomepageView` component tree.

### Out of Scope

- Search on `/`. No search input wiring — the existing topbar search affordance remains static.
- Changes to `/events` or any other route.
- New database columns (event banner, ticket sales, door time, artist headcount, panel count — all omitted from the featured hero per REQ-13).
- Keyboard shortcuts (`G` `E` etc. shown in the design footer).
- The design's "Tweaks" developer panel.
- Animations beyond what comes for free from existing Tailwind classes.
- A `/about` page for the old marketing copy.
- Organizer-specific rail or redirect — organizers see the public view (REQ-5).

## Acceptance Criteria

- [ ] Signed out, `/` shows the events list sorted by start date, with the public right rail and public filter chips.
- [ ] Signed in as an organizer, `/` shows the same public view as signed-out — except the Brand CTA card shows "Manage conventions" instead of the artist/organizer registration buttons.
- [ ] Signed in as an artist, `/` shows the artist filter chips, artist right rail (Quick status, Profile completeness, Notifications), and the context strip on cards with an application or an open call to a followed convention.
- [ ] The featured hero renders the first event in the filtered list and shows a countdown to `event_start_date`. It disappears when the list is empty.
- [ ] The filter chips correctly filter the list for both modes per REQ-10 and REQ-11.
- [ ] The public "By country" chip reveals country sub-chips derived from the current events' `venue_country` values, and selecting a sub-chip filters the list.
- [ ] Public rail's "Jump to month" shows month buckets with counts matching the current filtered list.
- [ ] Artist rail's Quick status counts match `applications` (all), accepted, under_review, and `convention_follows` for the signed-in artist.
- [ ] Artist rail's Profile completeness percentage matches the value shown on the authenticated dashboard.
- [ ] Artist rail's Notifications lists the 3 most recent notifications for the artist with correct relative timestamps.
- [ ] Event cards with a `logoPath` display the logo on the cover rail; cards without use a deterministic gradient based on convention id (same convention → same gradient across renders).
- [ ] Clicking anywhere on an event card (outside action buttons) navigates to `/events/{id}`.
- [ ] The page renders in both light and dark mode without visual regressions.
- [ ] The layout stacks correctly below `xl` (rail moves under the event list) and below `sm` (cover rail hides; date stamp inlined).
- [ ] `src/components/homepage/homepage-view.tsx` and its imports are removed; no dead references remain.
- [ ] Existing `/events` page is unchanged.
