# Phase 3 — Convention Setup

## Problem Statement

Convention organizers currently have an account and a convention name, but no way to describe their convention, create events, configure application requirements, or manage applications. Phase 3 builds the organizer's workspace: convention profile editing, event creation with structured data, per-event field configuration, application period controls, and convention-level allow/block lists. It also adds a public convention directory so artists can discover conventions.

## Requirements

- [REQ-1] Organizers can edit their convention profile: name, description, website URL, and logo/banner image
- [REQ-2] Convention logo/banner uses the existing sharp + storage adapter pattern (resize, WebP conversion, stored locally via the storage abstraction)
- [REQ-3] Conventions with a completed profile appear in a public convention directory at `/conventions` (visible to all users, including unauthenticated visitors)
- [REQ-4] Organizers can create multiple events under their convention, each with structured fields: name, description, dates (event start/end, application open/close), location (venue name, address, city, country, map embed URL), and artist logistics (available stands, table dimensions, price info, setup/teardown times, provided amenities checklist)
- [REQ-5] Only event name and event start date are required; all other event fields are optional
- [REQ-6] Organizers can edit existing events
- [REQ-7] Events are listed on the organizer's convention dashboard with key info at a glance (name, dates, status)
- [REQ-8] Organizers can configure which artist profile fields are required, optional, or not requested — per event — using the existing field registry
- [REQ-9] Organizers can set a minimum portfolio image count per event
- [REQ-10] Organizers can copy field configuration from a previous event as a starting point when creating or editing field config
- [REQ-11] Events have a status lifecycle: Draft → Accepting Applications → Reviewing (further statuses added in later phases)
- [REQ-12] Organizers can open applications for an event (status changes to "Accepting Applications")
- [REQ-13] Organizers can close applications for an event (status changes to "Reviewing")
- [REQ-14] Status transitions are one-directional: Draft → Accepting Applications → Reviewing (no going back)
- [REQ-15] Organizers can maintain an allow-list and a block-list at the convention level (persists across events)
- [REQ-16] Organizers can add artists to either list by searching display name or email
- [REQ-17] Artists have no indication that these lists exist — block-listed artists can still apply normally (flagging behavior is used during review in a later phase)

## Scope

### In Scope

- Convention profile editing (name, description, website, logo/banner image upload)
- Event CRUD (create, edit) with all structured fields from the PRD
- Per-event field configuration with the three-state toggle (not requested / optional / required)
- Copy field configuration from a previous event
- Minimum portfolio image count setting per event
- Event status lifecycle: Draft → Accepting Applications → Reviewing
- Open/close application period actions
- Convention-level allow-list and block-list management
- Artist search (by display name or email) for adding to lists
- Public convention directory page
- Organizer convention dashboard (replacing the current stub)

### Out of Scope

- Notifications when applications open (notification system is Phase 6)
- Artist "follow convention" feature (Phase 4)
- Artists browsing open events or applying (Phase 4)
- Application review UI, list flags showing during review (Phase 5)
- Response templates for accepted/rejected artists (Phase 5)
- Publishing results (Phase 5)
- Event archival / soft delete
- Map rendering from embed URL (store the URL; rendering deferred)
- Convention deletion / soft delete
- Payment or monetization

## Acceptance Criteria

**Convention Profile**
- [ ] Organizer can edit convention name, description, and website URL; changes persist after save
- [ ] Organizer can upload a logo/banner image (JPEG, PNG, WebP); image is processed (resized, WebP conversion) and displayed after upload
- [ ] Organizer can replace an existing logo/banner image
- [ ] Convention with name and description appears in the public directory at `/conventions`
- [ ] Public directory is accessible to unauthenticated users
- [ ] Each convention in the directory shows name, description, and logo (if uploaded)

**Events**
- [ ] Organizer can create a new event with just a name and start date (minimum required fields)
- [ ] Organizer can fill in all optional event fields: description, end date, application open/close dates, venue name, address, city, country, map embed URL, available stands, table dimensions, price info, setup/teardown times, provided amenities
- [ ] Provided amenities is a checklist (electricity, wifi, tables, chairs) plus a free-text "other" field
- [ ] Organizer can edit an existing event; changes persist
- [ ] Multiple events can exist under one convention
- [ ] Convention dashboard lists all events with name, dates, and current status

**Field Configuration**
- [ ] Organizer can configure each field registry field as not requested, optional, or required for a specific event
- [ ] Organizer can set a minimum portfolio image count for an event
- [ ] Organizer can copy field configuration from a previously created event
- [ ] Field configuration persists and can be edited after initial setup

**Application Period**
- [ ] New events start in "Draft" status
- [ ] Organizer can open applications (status changes to "Accepting Applications")
- [ ] Organizer can close applications (status changes to "Reviewing")
- [ ] Status transitions are one-directional — no option to revert to a previous status
- [ ] Current status is clearly displayed on the event in the dashboard

**Allow/Block Lists**
- [ ] Organizer can search for artists by display name or email
- [ ] Organizer can add an artist to the allow-list or block-list
- [ ] Organizer can remove an artist from either list
- [ ] Lists persist across page reloads
- [ ] Artists on the lists are shown with their display name and email

## Constraints

- Convention logo/banner: max 5 MB, JPEG/PNG/WebP only (same formats as portfolio; lower size limit since it's a single image)
- Amenities checklist uses a fixed set of known keys (electricity, wifi, tables, chairs) stored as JSONB, plus a free-text "other" field
- Event dates use date-only precision (no time-of-day), except setup/teardown times which are free text
