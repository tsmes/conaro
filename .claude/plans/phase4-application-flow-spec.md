# Phase 4 — Application Flow

## Problem Statement

Artists can see conventions in the directory but have no way to discover open events, follow conventions, or apply. Phase 4 connects the artist experience to the organizer's events: artists browse events accepting applications, view event details, follow conventions for updates, and apply with a one-click action that snapshots their profile and portfolio. The artist dashboard is expanded to show application status.

## Requirements

- [REQ-1] Artists can browse a list of events currently accepting applications, showing convention name, event name, dates, city/country, available stands, and application deadline
- [REQ-2] Clicking an event shows a detail page with all structured event info (venue, logistics, amenities, what's provided) and an "Apply" button
- [REQ-3] Artists can filter events by convention
- [REQ-4] Artists can follow/unfollow a convention from its public page
- [REQ-5] The artist dashboard shows a list of followed conventions
- [REQ-6] When an artist clicks "Apply", the system validates their profile against the event's required fields (including minimum portfolio image count)
- [REQ-7] If all required fields are filled, the application is submitted immediately (one-click)
- [REQ-8] A snapshot of the artist's profile data and portfolio images is stored with the application (images physically copied to a separate storage path)
- [REQ-9] If the artist is on the convention's block-list, the application is still submitted (artist sees no difference) but is flagged for the organizer
- [REQ-10] Confirmation message shown after successful submission; application appears on the artist dashboard as "Submitted"
- [REQ-11] If required fields are incomplete, the artist sees a clear list of what's missing with links to the relevant profile section
- [REQ-12] After filling in missing info, the artist can return to the event and complete the application
- [REQ-13] The artist dashboard lists all applications with convention name, event name, date applied, and current status
- [REQ-14] Application statuses displayed: Submitted, Under Review, Accepted, Rejected
- [REQ-15] Accepted/Rejected applications show the convention's response message (if any — response templates are Phase 5, but the display should be ready)

## Scope

### In Scope

- Events browsing page with open events listing and convention filter
- Event detail page (public, artist-facing) with full structured info and "Apply" button
- Convention detail page (public) with follow/unfollow button
- Convention follows table and follow/unfollow actions
- Applications table with profile data snapshot (JSONB) and status
- Application snapshot images (physical copy to separate storage path)
- Profile validation against event field requirements before submission
- Block-list flag on applications (invisible to artist, visible to organizer in Phase 5)
- Missing fields display with links to profile sections
- Artist dashboard expansion: application list with status, followed conventions list
- Artist header navigation update (add "Browse Events" link)
- StorageAdapter `copy` method (needed for image snapshot copying)

### Out of Scope

- Application review UI (accept/reject buttons — Phase 5)
- Response templates for accepted/rejected artists (Phase 5)
- Publishing results (Phase 5)
- Notifications when followed convention opens event (Phase 6)
- Email/push notifications on application status change (Phase 6)
- Waitlist tier (not in MVP)
- Allow-list special treatment during application (flagging only — review UI is Phase 5)
- Pagination on events listing or application history

## Acceptance Criteria

**Browse Events**
- [ ] Events page shows only events with status "accepting_applications"
- [ ] Each event card shows convention name, event name, event dates, city/country, available stands, and application close date
- [ ] Clicking an event navigates to its detail page
- [ ] Event detail page shows all structured info: description, dates, venue, address, map embed URL, logistics (stands, dimensions, price, setup/teardown), amenities
- [ ] Event detail page shows an "Apply" button for logged-in artists
- [ ] Events can be filtered by convention
- [ ] Unauthenticated users can browse events and see details but cannot apply

**Follow Convention**
- [ ] Convention detail page shows a "Follow" button for logged-in artists
- [ ] Clicking "Follow" toggles to "Following" (and vice versa)
- [ ] Artist dashboard shows a list of followed conventions with links to their pages
- [ ] Follow state persists across page reloads

**Apply — Happy Path**
- [ ] Clicking "Apply" when profile meets all required fields submits the application immediately
- [ ] A snapshot of profile text data is stored with the application
- [ ] Portfolio images are physically copied to a snapshot storage path
- [ ] Confirmation message "Application submitted!" is shown
- [ ] Application appears on artist dashboard with status "Submitted"
- [ ] Artist cannot apply to the same event twice
- [ ] Block-listed artists can apply normally (see no indication of block status)

**Apply — Missing Info**
- [ ] Clicking "Apply" when required fields are missing shows a list of missing fields
- [ ] Each missing field links to the relevant profile section
- [ ] Minimum portfolio image count is checked (if event requires it)
- [ ] After filling in missing info and returning, the artist can apply successfully

**Artist Dashboard**
- [ ] Dashboard lists all applications with convention name, event name, date applied, and status
- [ ] Status uses color coding: gray (submitted), blue (under review), green (accepted), red (rejected)
- [ ] Accepted/rejected applications show the response message area (empty until Phase 5 populates it)

## Constraints

- Application snapshot images are stored at `snapshots/{eventId}/{applicationId}/{imageId}.webp`
- Profile data snapshot is stored as JSONB on the application record (not a separate table)
- StorageAdapter needs a `copy(fromKey, toKey)` method added to support snapshot image copying
