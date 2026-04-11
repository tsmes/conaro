# PRD: Art Apply — Convention Application Platform

## Introduction

Artists applying for stands at conventions currently face a fragmented, repetitive process: filling out Google Forms from scratch each time, hunting for portfolio photos, re-typing the same bio and logistics info, and often receiving no confirmation that their application was submitted. Conventions, on their side, manage applications through spreadsheets and email threads with no structured review workflow.

**Art Apply** is a web platform that solves both sides. Artists maintain a single profile with their information and portfolio. Conventions define what they need and open application periods. Applying is a one-click action. The platform handles notifications, status tracking, and the review process — keeping everything in one place for both parties.

## Goals

- Eliminate repetitive data entry for artists applying to multiple conventions
- Give artists a single place to manage their profile, portfolio, and application history
- Give conventions a structured way to collect, review, and respond to applications
- Provide clear application status tracking with proactive notifications
- Build a foundation that can grow with additional field types and review features over time

## User Roles

- **Artist**: A person who wants to apply for a table/stand at one or more conventions
- **Convention Organizer**: A person or team managing a convention and its events (e.g., "Kawaiicon" is the convention; "Kawaiicon 2026" and "Kawaiicon 2027" are separate events, each with their own application period)

## Data Model Concepts

- **Convention**: The overarching organization/brand (e.g., "Kawaiicon"). Owned by an organizer.
- **Event**: A specific occurrence of a convention (e.g., "Kawaiicon 2026", "Summer Temp Con 2026"). Each event has its own application period, field requirements, and applicant list.
- **Application**: An artist's submission to a specific event. Contains a snapshot of the artist's profile and portfolio at time of submission.

An organizer can have one convention with multiple events. Events share the convention's branding but are independently configured. This enables:
- Artist application history per convention (across events)
- Organizer-managed allow-lists and block-lists at the convention level
- Separate field requirements and response templates per event

---

## User Stories

### Authentication & Profiles

#### US-001: Artist registration
**Description:** As a visitor, I want to create an artist account with email and password so that I can start building my profile.

**Acceptance Criteria:**
- [ ] Registration form with email, password, confirm password, and display name
- [ ] Email validation (format + uniqueness)
- [ ] Password minimum 8 characters
- [ ] On success, redirect to artist dashboard
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-002: Convention organizer registration
**Description:** As a visitor, I want to create a convention organizer account so that I can set up my convention and manage applications.

**Acceptance Criteria:**
- [ ] Registration form with email, password, confirm password, display name, and convention/organization name
- [ ] Same validation rules as artist registration
- [ ] On success, redirect to convention dashboard
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-003: Login
**Description:** As a registered user (artist or organizer), I want to log in with my email and password so that I can access my dashboard.

**Acceptance Criteria:**
- [ ] Login form with email and password
- [ ] Error message on invalid credentials (without revealing which field is wrong)
- [ ] Redirect to appropriate dashboard based on user role
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-004: Logout
**Description:** As a logged-in user, I want to log out so that my session is ended.

**Acceptance Criteria:**
- [ ] Logout button visible when logged in
- [ ] Clears session and redirects to homepage
- [ ] Typecheck/lint passes

---

### Artist Profile

#### US-005: Edit artist profile — basic info
**Description:** As an artist, I want to fill in my profile information once so that I don't have to re-enter it for every convention.

**Acceptance Criteria:**
- [ ] Editable fields: display name, real name, email (contact), phone number, bio/description, city/region, website/social links
- [ ] All fields save on form submission
- [ ] Validation on required fields (display name, contact email)
- [ ] Success feedback after saving
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-006: Edit artist profile — logistics info
**Description:** As an artist, I want to specify logistics details (helpers, accessibility needs, table preferences) so that conventions have this info when I apply.

**Acceptance Criteria:**
- [ ] Editable fields: number of helpers (0–5), accessibility needs (free text), table size preference, any additional notes
- [ ] Fields save on form submission
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-007: Upload portfolio images
**Description:** As an artist, I want to upload sample images of my work so that conventions can see my portfolio when I apply.

**Acceptance Criteria:**
- [ ] Upload up to 20 images
- [ ] Accepted formats: JPEG, PNG, WebP
- [ ] Max file size: 10 MB per image
- [ ] Drag-and-drop or file picker upload
- [ ] Image preview after upload
- [ ] Ability to reorder images (drag to sort)
- [ ] Ability to delete individual images
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-008: View own profile completeness
**Description:** As an artist, I want to see which profile sections are complete so that I know what I still need to fill in.

**Acceptance Criteria:**
- [ ] Profile page shows completion indicator per section (basic info, logistics, portfolio)
- [ ] Incomplete sections are visually distinct (e.g., warning badge)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Convention Setup

#### US-009: Create convention profile
**Description:** As a convention organizer, I want to create a profile for my convention (the overarching brand) so that it serves as the home for all my events.

**Acceptance Criteria:**
- [ ] Fields: convention name, description, website, logo/banner image
- [ ] All fields save on submission
- [ ] Convention appears in a public listing after creation
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-010: Create event under convention
**Description:** As a convention organizer, I want to create events under my convention (e.g., "Kawaiicon 2026") so that each occurrence has its own application period and details.

**Acceptance Criteria:**
- [ ] Event has the following structured fields:
  - **Basic**: Event name, description (free text/rich text)
  - **Dates**: Event start date, event end date, application open date (optional — can be opened manually), application close date (optional — can be closed manually)
  - **Location**: Venue name, street address, city, country, map embed (via Google Maps Embed API or similar — display-only, not a full Places autocomplete)
  - **Artist logistics**: Number of available stands, table/stand dimensions (free text, e.g., "2m x 1m"), price per table (informational text — no payment processing), setup time, teardown time, what's provided (checklist: electricity, wifi, tables, chairs, other with free text)
- [ ] Event is linked to the parent convention
- [ ] Multiple events can exist under one convention
- [ ] Events listed on the convention's public page with key info visible at a glance (dates, location, available stands)
- [ ] All structured fields are optional except event name and event start date — organizers fill in what they have
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-011: Configure required application fields per event
**Description:** As a convention organizer, I want to choose which artist profile fields are required for a specific event's application so that I collect exactly the information I need.

**Acceptance Criteria:**
- [ ] Toggle list of available fields: display name, real name, bio/description, contact email, phone, city/region, website/social links, number of helpers, accessibility needs, table size preference, additional notes, portfolio images
- [ ] Each field can be toggled as: not requested / optional / required
- [ ] Minimum portfolio image count can be set (e.g., "at least 3 images")
- [ ] Configuration is per-event (not per-convention)
- [ ] Can copy field configuration from a previous event as a starting point
- [ ] Configuration saves and persists
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-012: Open application period for event
**Description:** As a convention organizer, I want to open applications for a specific event so that artists can start applying.

**Acceptance Criteria:**
- [ ] "Open Applications" action on the event page within the convention dashboard
- [ ] Optional: set an automatic closing date
- [ ] Event status changes to "Accepting Applications"
- [ ] All artists who follow this convention receive a notification
- [ ] All artists with general "new applications open" notifications enabled are also notified
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-013: Close application period for event
**Description:** As a convention organizer, I want to close applications for an event so that no new applications are accepted and I can begin reviewing.

**Acceptance Criteria:**
- [ ] "Close Applications" action on the event page
- [ ] Event status changes to "Reviewing"
- [ ] Artists can no longer submit new applications for this event
- [ ] Existing applications are preserved
- [ ] Typecheck/lint passes

#### US-014: Manage artist allow-list and block-list
**Description:** As a convention organizer, I want to maintain an allow-list and block-list at the convention level so that I can streamline or restrict applications across all my events.

**Acceptance Criteria:**
- [ ] Convention settings page with allow-list and block-list sections
- [ ] Can add artists by searching their display name or email
- [ ] Allow-listed artists are visually flagged when reviewing applications
- [ ] Block-listed artists can still apply normally (they see no indication they are blocked)
- [ ] Applications from block-listed artists are flagged in the organizer's review UI
- [ ] Lists persist across events
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Application Flow

#### US-015: Browse open events
**Description:** As an artist, I want to see a list of events currently accepting applications so that I can find ones to apply to.

**Acceptance Criteria:**
- [ ] List/grid of events with status "Accepting Applications"
- [ ] Each card shows: convention name, event name, date(s), city/country, number of available stands, application deadline (if set)
- [ ] Clicking an event shows its full detail page with all structured info (venue, map, logistics, what's provided) and an "Apply" button
- [ ] Can filter by convention or browse all open events
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-016: Follow a convention
**Description:** As an artist, I want to follow a convention so that I'm notified when they open applications for a new event.

**Acceptance Criteria:**
- [ ] "Follow" button on convention profile page
- [ ] Following state is togglable (follow/unfollow)
- [ ] Artist's dashboard shows a list of followed conventions
- [ ] When a followed convention opens an event, artist receives a notification
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-017: Apply to an event — happy path
**Description:** As an artist, I want to click "Apply" on an event and have my existing profile information submitted so that applying is effortless.

**Acceptance Criteria:**
- [ ] "Apply" button on event detail page
- [ ] System checks artist profile against the event's required fields
- [ ] If artist is on the convention's block-list, application is still submitted (artist sees no difference) but is flagged for the organizer
- [ ] If all required fields are filled: application is submitted immediately
- [ ] A snapshot of the artist's profile data and portfolio images is stored with the application
- [ ] Confirmation message shown: "Application submitted!"
- [ ] Application appears on artist dashboard with status "Submitted"
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-018: Apply to an event — missing info
**Description:** As an artist, I want to be told what information is missing before I can apply so that I can fill it in and then submit.

**Acceptance Criteria:**
- [ ] If required fields are incomplete, show a clear list of what's missing
- [ ] Each missing item links to the relevant profile section to edit
- [ ] After filling in missing info, artist can return and complete the application
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-019: Artist dashboard — application status
**Description:** As an artist, I want to see the status of all my applications on my dashboard so that I know where things stand.

**Acceptance Criteria:**
- [ ] Dashboard lists all applications with: convention name, event name, date applied, current status
- [ ] Statuses: Submitted, Under Review, Accepted, Rejected
- [ ] Accepted/Rejected applications show the convention's response message (if any)
- [ ] Applications grouped or filterable by convention
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Application Review

#### US-020: View applicant list for event
**Description:** As a convention organizer, I want to see all submitted applications for a specific event so that I can review them.

**Acceptance Criteria:**
- [ ] List of all applications for the selected event
- [ ] Each entry shows: artist display name, date submitted, current status (Submitted / Accepted / Rejected)
- [ ] Allow-listed artists are visually flagged
- [ ] Clicking an applicant shows their full submitted snapshot and portfolio
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-021: Review individual applicant
**Description:** As a convention organizer, I want to view an applicant's submitted profile snapshot and portfolio so that I can make an informed decision.

**Acceptance Criteria:**
- [ ] Detail view shows the snapshot of the artist's profile at time of application (not their current profile)
- [ ] Portfolio images displayed in a gallery/grid (from the snapshot copy)
- [ ] Accept and Reject buttons visible
- [ ] Link to view the artist's application history with this convention (previous events)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-022: Accept or reject an applicant
**Description:** As a convention organizer, I want to accept or reject each applicant so that I can build my final artist lineup.

**Acceptance Criteria:**
- [ ] "Accept" and "Reject" buttons on applicant detail view
- [ ] Status updates immediately in the applicant list
- [ ] Organizer can change decision before publishing results (toggle between accept/reject)
- [ ] Typecheck/lint passes

#### US-023: Configure response template per event
**Description:** As a convention organizer, I want to write custom response messages for accepted and rejected artists so that they receive a personalized response.

**Acceptance Criteria:**
- [ ] Text fields for "Acceptance message" and "Rejection message" in event settings
- [ ] Messages support basic formatting (line breaks at minimum)
- [ ] Can copy templates from a previous event as a starting point
- [ ] These messages are shown to artists when results are published
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-024: Publish results for event
**Description:** As a convention organizer, I want to publish all decisions for an event at once so that every applicant is notified of the outcome simultaneously.

**Acceptance Criteria:**
- [ ] "Publish Results" action — only available when all applicants have a decision (accepted or rejected)
- [ ] Warning if any applicants have no decision yet
- [ ] On publish: all application statuses become visible to artists
- [ ] All applicants receive a notification with their result
- [ ] Event status changes to "Results Published"
- [ ] This action cannot be undone
- [ ] Typecheck/lint passes

---

### Notification System

#### US-025: Notification preferences
**Description:** As a user, I want to configure how I receive notifications so that I'm informed without being overwhelmed.

**Acceptance Criteria:**
- [ ] Settings page with notification toggles
- [ ] Channels: in-app (always on), email (toggle), push (toggle)
- [ ] Artists can toggle: followed convention opens event, any new event opens, application status changes, general announcements
- [ ] Organizers can toggle: new application received, application period reminders
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-026: In-app notifications
**Description:** As a user, I want to see notifications within the platform so that I don't miss important updates.

**Acceptance Criteria:**
- [ ] Notification bell/icon in the header with unread count badge
- [ ] Dropdown or page showing notification list
- [ ] Each notification: icon, message, timestamp, read/unread state
- [ ] Clicking a notification navigates to the relevant page
- [ ] Mark as read on click; "Mark all as read" action
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

#### US-027: Email notifications
**Description:** As a user, I want to receive email notifications for important events so that I'm informed even when I'm not on the platform.

**Acceptance Criteria:**
- [ ] Emails sent for: followed convention opens event (artists), application status change (artists), new application received (organizers), results published (artists)
- [ ] Emails include a link back to the relevant page
- [ ] Only sent if user has email notifications enabled
- [ ] Typecheck/lint passes

#### US-028: Push notifications
**Description:** As a user, I want to receive browser push notifications so that I get real-time updates.

**Acceptance Criteria:**
- [ ] Browser permission prompt on opt-in
- [ ] Push sent for same events as email notifications
- [ ] Only sent if user has push notifications enabled
- [ ] Typecheck/lint passes

---

## Functional Requirements

- **FR-01**: The system must support two user roles: Artist and Convention Organizer
- **FR-02**: Users register and log in with email and password (Supabase Auth)
- **FR-03**: Artists can create and edit a persistent profile with basic info, logistics info, and portfolio images
- **FR-04**: Artists can upload up to 20 images (JPEG, PNG, WebP; max 10 MB each) stored in Supabase Storage
- **FR-05**: Artists can reorder and delete portfolio images; deleting an image removes the file from R2 immediately
- **FR-06**: Convention organizers can create a convention profile (the brand) with name, description, website, and branding
- **FR-07**: Organizers can create multiple events under a convention, each with structured data: name, description, dates (event + application period), location (venue, address, city, country, map embed), and artist logistics (stand count, dimensions, pricing info, setup/teardown times, provided amenities)
- **FR-08**: Organizers configure which artist profile fields are required, optional, or not requested per event
- **FR-09**: The set of toggleable fields is defined in a central registry so new fields can be added with minimal code changes
- **FR-10**: Organizers can open and close application periods per event
- **FR-11**: When applications open for an event, the system sends notifications to followers of that convention and to artists with general notifications enabled
- **FR-12**: Artists can follow conventions to receive notifications about new events
- **FR-13**: Artists can browse events with open applications
- **FR-14**: When an artist clicks "Apply", the system validates their profile against the event's required fields (block-list status does not prevent submission — it only flags the application for the organizer)
- **FR-15**: If validation passes, the application is submitted and a full snapshot of the artist's profile data and portfolio images is stored with the application
- **FR-16**: If validation fails, the artist sees exactly which fields are missing with links to edit them
- **FR-17**: Artists see all their applications and statuses on their dashboard
- **FR-18**: Organizers see all applicants for an event and can view each artist's submitted snapshot and portfolio
- **FR-19**: Organizers can view an artist's application history with their convention (across events)
- **FR-20**: Organizers can accept or reject each applicant, with the ability to change decisions before publishing
- **FR-21**: Organizers can configure custom acceptance and rejection message templates per event
- **FR-22**: Organizers can copy field configuration and response templates from previous events
- **FR-23**: Organizers publish results per event in a single action, making all decisions visible and triggering notifications
- **FR-24**: Publishing requires all applicants to have a decision; the system warns if any are undecided
- **FR-25**: Organizers can maintain allow-lists and block-lists at the convention level
- **FR-26**: The notification system supports in-app, email, and push channels with user-configurable preferences
- **FR-27**: In-app notifications include an unread count, notification list, and navigation to relevant content

## Non-Goals (Out of Scope for MVP)

- **Payment processing** — no table fees, deposits, or invoicing
- **Waitlist tier** — accept/reject only for MVP; waitlist is a future addition
- **Custom form builder** — conventions choose from a fixed field set; no drag-and-drop form designer
- **Multi-convention per organizer** — one convention per organizer account; if someone runs two conventions, they create two accounts
- **Chat or messaging** between artists and organizers
- **Public artist galleries** — portfolios are only visible to conventions the artist applies to
- **Mobile native app** — responsive web only
- **Admin/superadmin panel** — no platform-level administration
- **Analytics or reporting** — no dashboards for application statistics
- **Automated scheduling or table assignment** — organizers just accept/reject, no seating charts
- **Social features** — no liking or commenting (following conventions is in scope, but no social interaction beyond that)

## Design Considerations

- Use **shadcn/ui** components throughout for consistent design language
- Dashboard layouts should prioritize clarity: status at a glance, actions obvious
- Portfolio image gallery should support lightbox viewing for organizer review
- Mobile-responsive layouts are required — many artists will check status on their phones
- Convention listing page should feel like a simple marketplace/directory
- Application status should use clear color coding: gray (submitted), blue (under review), green (accepted), red (rejected)

## Tech Stack

### Core
| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js 15 (App Router) | Server components for data fetching, client components for interactive forms |
| **Language** | TypeScript | Strict mode |
| **Styling** | Tailwind CSS | Utility-first |
| **UI Components** | shadcn/ui | Consistent design system |

### Infrastructure & Services
| Concern | Technology | Notes |
|---------|-----------|-------|
| **Hosting** | Railway | Next.js deployment |
| **Database** | PostgreSQL on Railway | Single managed instance |
| **ORM** | Drizzle ORM | Type-safe, SQL-native, built-in migrations, Drizzle adapter for Auth.js |
| **Auth** | Auth.js v5 (NextAuth) | Email/password via Credentials provider, session management, Drizzle adapter for user/session storage in PostgreSQL |
| **Image Storage** | Cloudflare R2 | S3-compatible, no egress fees, built-in CDN |
| **Email** | Resend + React Email | Simple API, JSX email templates, free tier (3,000/month) |
| **Push Notifications** | web-push (npm) | Web Push API, lightweight |

### Key Libraries
| Purpose | Library |
|---------|---------|
| R2/S3 access | `@aws-sdk/client-s3` |
| Server-side image processing | `sharp` (resize to 2048px max, compress to ~80% WebP/JPEG) |
| Client-side image compression | `browser-image-compression` (pre-compress before upload) |
| Display optimization | Next.js `Image` component with R2 URLs |

### External Services Summary
Only three external services beyond the codebase:
1. **Railway** — hosting + PostgreSQL
2. **Cloudflare R2** — image storage
3. **Resend** — transactional email

## Technical Considerations

- **Convention/Event hierarchy**: Conventions are the parent entity; events are children. Applications belong to events. Allow-lists and block-lists live at the convention level. This mirrors how conventions actually work (Kawaiicon is the brand, Kawaiicon 2026 is the event).
- **Event structured data**: Events store structured fields (dates, location, logistics) as typed columns — not free-text blobs. Location stored as discrete fields (venue name, address, city, country) plus a map embed URL. Amenities stored as a JSONB array of known keys (electricity, wifi, tables, chairs) plus a free-text "other" field. This keeps data queryable and display-consistent while remaining flexible.
- **Map integration**: Use Google Maps Embed API (free, no API key required for basic embeds) to display a map on the event detail page based on the venue address. No Places autocomplete or geocoding — organizers paste their address and optionally provide a Google Maps link. Keep it simple; upgrade to Places API later if needed.
- **Application snapshots**: When an artist applies, copy their current profile data AND portfolio images into a snapshot stored with the application. This ensures organizers see exactly what was submitted, even if the artist later updates their profile or portfolio. Image copies stored in a separate R2 path per application (e.g., `snapshots/{event_id}/{application_id}/`).
- **Field registry**: Define the toggleable field set as a typed constant/config so adding a new field means adding one entry plus a profile form field — no schema migration for the toggle system itself (use a JSONB column or a join table for event field requirements).
- **Image optimization**: Compress and resize images on upload (max 2048px longest edge, ~80% quality WebP/JPEG) using `sharp` server-side. Client-side pre-compression via `browser-image-compression` to reduce upload bandwidth. Optimized images stored in R2; served via Cloudflare CDN. Use Next.js Image component for display-time optimization.
- **Auth & security**: Auth.js v5 with Credentials provider for email/password. Sessions stored in PostgreSQL via Drizzle adapter. Role (artist/organizer) stored in a `profiles` table. Application-level middleware for route protection and role-based access control.
- **Notifications**: In-app via a `notifications` table in PostgreSQL, polled every 30 seconds from the client. Email via Resend with React Email templates. Push via Web Push API using the `web-push` npm package. All channels are user-configurable.

## Success Metrics

- An artist can go from "new account" to "first application submitted" in under 10 minutes
- Applying to a second convention (with a complete profile) takes under 30 seconds
- Convention organizers can review and decide on an applicant in under 2 minutes
- Zero data re-entry required for artists applying to multiple conventions
- All application status changes are reflected on the artist dashboard within seconds

## Monetization

**Payer**: Convention organizers. Artists use the platform for free.

**Pricing philosophy**: Low cost, accessible to small community-run conventions — this is not enterprise software. The goal is to be cheaper and better than the "Google Forms + spreadsheet" alternative, not to maximize revenue per customer.

**Potential models** (to be validated — not implemented in MVP):

| Model | How it works | Pros | Cons |
|-------|-------------|------|------|
| **Per-event fee** | Flat fee per event opened (e.g., $10–30) | Simple, predictable for organizers | Revenue only when events are active |
| **Tiered by applicants** | Free up to N applicants, paid above that | Low barrier to entry, scales with size | Harder to predict cost for organizers |
| **Annual subscription** | Flat yearly fee per convention (e.g., $50–100/year) | Predictable for both sides, simple | May feel expensive for one-event-per-year conventions |
| **Freemium** | Free core features, paid for extras (e.g., custom response templates, allow/block lists, email notifications) | Easy adoption | Feature-gating can frustrate users |

**Recommendation**: Start with a **free MVP** — no payment at all. Focus on adoption and proving value. Once there's traction, a **per-event fee** or **low annual subscription** is the cleanest model for this audience. Avoid feature-gating — the value proposition is "everything in one place", and locking features behind a paywall undermines that.

**Not in scope for MVP**: No payment integration, no billing UI, no subscription management. Monetization is a future phase once the product is validated.

## Resolved Decisions

1. **Recurring conventions**: Modeled as Convention (brand) → Event (occurrence). Artists apply to events; history is tracked per convention across events. *(Scoped in as multi-event)*
2. **Cross-convention visibility**: No. Organizers cannot see an artist's history with other conventions.
3. **Follow feature**: Yes. Artists can follow conventions to be notified when new events open. *(Scoped in)*
4. **Convention deletion**: Soft delete. Convention and its events are archived; application history preserved.
5. **Application snapshot**: Full copy, including images. Stored separately per application.
6. **Image optimization from day one**: All uploaded images are compressed and resized on upload to reduce storage costs across the board.
7. **One convention per account**: Each convention is its own organizer account. No multi-convention management needed.
8. **Block/allow lists are fully internal**: Artists have no indication that these lists exist. A blocked artist applies as normal and sees their application as "Submitted" like anyone else. On the organizer's side, the application is received and visible but flagged as being on the block-list. The organizer decides what to do with it — the system does not auto-reject. Allow-listed artists are similarly flagged in the organizer's review UI.
9. **Event archival**: Events auto-archive 30 days after results are published. Archived events move to a collapsible "Archived" section on the dashboard — still accessible, just not cluttering the active view.
10. **Event logistics for accepted artists**: Post-MVP feature — event page will support posting rigging times, open/close hours, and other logistics visible to accepted artists. Keeps all event info in one place so artists don't have to hunt for it. When implemented, archival timing should shift from "30 days after publish" to "30 days after event end date".
11. **Image cleanup**: When an artist deletes an image from their profile, the file is deleted from R2 immediately. Snapshot images (copies made at application time) are cleaned up when an archived event is old enough — e.g., delete snapshot images 90 days after archival. Profile data snapshots (text) are retained indefinitely as they're cheap to store.
12. **No separate snapshot retention policy needed**: Between image optimization on upload and the archival cleanup rule above, storage growth is managed. No need for a blanket retention policy.
