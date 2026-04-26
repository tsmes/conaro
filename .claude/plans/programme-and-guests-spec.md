# Programme + Guests for events

## Problem Statement

Conventions advertise their schedule (panels, workshops, signings) and their featured guests (guest of honour, workshop hosts, special speakers) on every event page they have. Today the platform has no way to record either: organizers paste schedules into descriptions or off-platform sites, con-goers scroll past flat text, and the public event surface — already redesigned with Programme / Guests tabs in the hand-off — has placeholder gaps. Both surfaces show on the public event detail page; both are organizer-edited in event settings.

## Requirements

### Programme

- [REQ-P1] An event has an optional ordered list of programme items. Each item has: a date (within the event's date range), a start time (HH:mm), a title (max 200 chars). Each item may also have: an end time, a room/stage name (free text, max 80 chars), and a speaker/host name (free text, max 200 chars).
- [REQ-P2] The organizer can add, edit, delete, and reorder programme items in a dedicated Programme settings page.
- [REQ-P3] The public event detail surface shows a Programme tab when the event has at least one programme item. The tab is hidden otherwise.
- [REQ-P4] The Programme tab groups items by date (asc). Within a date, items are ordered by start time (asc); ties break on insertion order. Each item shows time, title, optional speaker, and optional room as a badge — matching the design hand-off's table layout.
- [REQ-P5] Programme item dates outside the event's date range are rejected at save with a field-level error.
- [REQ-P6] Programme is visible to all viewers (logged-in or not) once it has any items. There is no separate "publish programme" flag; saving an item makes it visible.

### Guests

- [REQ-G1] An event has an optional ordered list of featured guests. Each guest has: a display name (max 200 chars), a title (free text, max 80 chars — e.g. "Guest of honour", "Workshop host"). Each guest may also have: a role/origin line (max 200 chars — e.g. "Cartoonist · Helsinki"), pronouns (max 40 chars), a bio (markdown, max 4 000 chars), one image, a website URL, and a list of social links (same shape as artist profile social links).
- [REQ-G2] The organizer can add, edit, delete, and reorder guests in a dedicated Guests settings page.
- [REQ-G3] The organizer can upload one image per guest (jpeg/png/webp, ≤ 5 MB). Replacing an image deletes the previous file from storage. Removing a guest deletes their image.
- [REQ-G4] The public event detail surface shows a Guests tab when the event has at least one guest. The tab is hidden otherwise.
- [REQ-G5] The Guests tab renders each guest as a card showing: portrait (or fallback initials when no image), name, title badge, role/pronouns, bio (rendered as markdown), and a chip row of links (website + socials).
- [REQ-G6] Guests are visible to all viewers (logged-in or not). There is no separate "publish guests" flag.

## Scope

### In Scope

- Schema additions: nullable JSONB columns `events.programme` and `events.guests`.
- New organizer settings pages: Programme editor and Guests editor (both under `manage/events/[eventId]/`).
- Image upload for guests via the existing local storage adapter; storage paths stored in the guest record.
- New public tabs: Programme and Guests, gated on data presence.
- New tab gating helpers in `event-context.ts` (`shouldShowProgrammeTab`, `shouldShowGuestsTab`).
- Server action(s) for saving programme and guests; client editors that call them.
- Markdown rendering of guest bios using the existing `<Markdown>` component.

### Out of Scope

- Programme ↔ guest linking (a programme item's speaker text is free-form and does not reference a guest record).
- Multiple images per guest, captions on images, image cropping.
- Programme item descriptions / longer body text — title + speaker + room is enough at-a-glance.
- Calendar export (.ics) for programme items.
- Notifications when programme or guests change.
- Programme conflict detection (two items in the same room overlapping).
- "Add to plan" / personal schedule for con-goers.
- A "featured" / spotlight flag — the title text ("Guest of honour") is enough to convey hierarchy in the v1 grid.
- Backfilling existing events — both columns default to null.

## Acceptance Criteria

- [ ] Migration adds `events.programme` (jsonb, nullable) and `events.guests` (jsonb, nullable). Existing events get null for both.
- [ ] Visiting the public event detail page on an event with no programme items hides the Programme tab.
- [ ] After the organizer adds a programme item via the new Programme settings page, the Programme tab appears on the public surface and renders the item.
- [ ] The Programme tab groups items by date in ascending order; items within a date are ordered by start time.
- [ ] Editing a programme item with a date outside the event's start–end range is rejected with a field-level error and no DB write.
- [ ] Deleting a programme item via the editor removes it from the public Programme tab.
- [ ] Re-ordering items in the editor preserves the order on the public tab when start times tie.
- [ ] Visiting an event with no guests hides the Guests tab.
- [ ] After the organizer adds a guest, the Guests tab appears and renders the guest card with name, title, and (when set) role, pronouns, bio, image, and links.
- [ ] Uploading a new image for an existing guest replaces the old file in storage.
- [ ] Deleting a guest removes their image from storage and the public tab.
- [ ] Both new tabs are visible to logged-out viewers — no auth gating.
- [ ] Both new tabs survive a hard reload — data is persisted, not session-state.

## Constraints

- Storage shape: both features use JSONB on `events`, mirroring `events.floorPlan`. No new tables.
- Image storage: reuse the existing `StorageAdapter` (`/api/uploads/<key>`). No new upload endpoint.
- The two organizer settings pages live under the existing event settings tree (`manage/events/[eventId]/programme/`, `manage/events/[eventId]/guests/`) and slot into the organizer's `EventTabsNav` as two new top-level tabs after "Event details" / "Artists".
- The public Programme + Guests tabs slot into the existing `ArtistEventTabsNav`. Tab order from the design: Overview / Programme / Guests / Artists / Floor plan / Practical info / Messages.
