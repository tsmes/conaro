# Implementation Plan: Phase 5 — Application Review

Spec: `.claude/plans/phase5-application-review-spec.md`

## Technical Decisions

- **DB migration**: Extend `event_status` enum with `results_published`. Extend `application_status` enum with `revoked`. Add `acceptanceMessage` and `rejectionMessage` text columns to events. Add `paymentConfirmed` boolean (default false) to applications.
- **Route structure**: `/conventions/manage/events/[eventId]/applications` (applicant list + templates + publish) and `/conventions/manage/events/[eventId]/applications/[applicationId]` (applicant detail with snapshot, gallery, accept/reject, history).
- **Response templates on applications page**: Template fields placed as a Card section above the applicant list, keeping the review flow self-contained.
- **Copy templates**: Client-side pattern matching field config copy — server passes other events' templates as props.
- **Accept/reject**: Single `setApplicationDecision(applicationId, status)` action. Toggle by calling with opposite status. Only allowed when event is in `reviewing` status.
- **Publish results**: Transaction: verify all decided → set each application's responseMessage from template → change event status to `results_published`.
- **Payment + revoke**: `confirmPayment` toggles `paymentConfirmed` (post-publish, accepted only). `revokeApplication` changes status to `revoked` with message (post-publish, accepted only).
- **Artist dashboard masking**: If event status is `reviewing`, show "Under Review" instead of actual application status. If `results_published`, show real status. Add `revoked` to styles.
- **Allow/block flags**: Join `conventionArtistLists` when fetching applicants. Show badges.
- **Application history**: Query applications for same profileId + conventionId across events.

## Tasks

### 1. Database migration: extend enums + add columns
Extend event and application status enums and add new columns to events and applications tables.

**Requirements:** Infrastructure (enables REQ-14, REQ-17, REQ-20, REQ-21)

**Files:**
- `src/lib/db/schema/events.ts` — modify: add `results_published` to eventStatusEnum, add `acceptanceMessage` and `rejectionMessage` text columns
- `src/lib/db/schema/applications.ts` — modify: add `revoked` to applicationStatusEnum, add `paymentConfirmed` boolean column

**Approach:**
- Add `"results_published"` to the eventStatusEnum array
- Add `acceptanceMessage: text("acceptance_message")` and `rejectionMessage: text("rejection_message")` to events table (nullable)
- Add `"revoked"` to the applicationStatusEnum array
- Add `paymentConfirmed: boolean("payment_confirmed").notNull().default(false)` to applications table
- Generate migration: `npm run db:generate`
- The migration will use `ALTER TYPE ... ADD VALUE` for enum extensions — these are non-transactional in Postgres but safe
- Apply to dev and test databases

**Verification:** Migration applies cleanly; `npm run build` succeeds
**Depends on:** none

### 2. Review actions: accept/reject, publish, payment, revoke
Server actions for the review workflow.

**Requirements:** REQ-8, REQ-9, REQ-10, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18, REQ-20, REQ-21

**Files:**
- `src/app/conventions/manage/events/[eventId]/applications/actions.ts` — new: `setApplicationDecision`, `publishResults`, `confirmPayment`, `revokeApplication`, `updateResponseTemplates`

**Approach:**
- `setApplicationDecision(prevState, formData)`:
  - Auth check: organizer role
  - Get applicationId and decision (`accepted` | `rejected`) from formData
  - Verify event ownership via `getOrganizerEvent`
  - Verify event status is `reviewing` (not yet published)
  - Update application status, set `updatedAt`
  - Revalidate applications page
- `publishResults(prevState, formData)`:
  - Auth check, verify event ownership, verify status is `reviewing`
  - Count applications with `status = "submitted"` (undecided) — return error with count if > 0
  - In a transaction:
    - Fetch event's `acceptanceMessage` and `rejectionMessage`
    - Update all `accepted` applications: set `responseMessage = acceptanceMessage`
    - Update all `rejected` applications: set `responseMessage = rejectionMessage`
    - Update event status to `results_published`, set `updatedAt`
  - Revalidate manage dashboard and applications page
- `confirmPayment(prevState, formData)`:
  - Auth check, verify event ownership
  - Verify event status is `results_published`
  - Verify application status is `accepted`
  - Toggle `paymentConfirmed` (flip the boolean)
  - Revalidate applications page
- `revokeApplication(prevState, formData)`:
  - Auth check, verify event ownership
  - Verify event status is `results_published`
  - Verify application status is `accepted`
  - Get revocation message from formData
  - Update application: status → `revoked`, responseMessage → revocation message, set `updatedAt`
  - Revalidate applications page
- `updateResponseTemplates(prevState, formData)`:
  - Auth check, verify event ownership
  - Parse `acceptanceMessage` and `rejectionMessage` from formData
  - Update event with the template values
  - Revalidate applications page

**Verification:** `npm run build` compiles
**Depends on:** 1

### 3. Update organizer event detail page — add review link
Add a "Review Applications" link and application count to the event detail page.

**Requirements:** Infrastructure (navigation for REQ-1, REQ-4)

**Files:**
- `src/app/conventions/manage/events/[eventId]/page.tsx` — modify: add applications link with count
- `src/app/conventions/manage/page.tsx` — modify: add `results_published` to STATUS_LABELS
- `src/components/conventions/event-status-controls.tsx` — modify: handle `results_published` status display

**Approach:**
- Event detail page: query application count for this event (simple `count()` query). Add a "Review Applications (N)" button/link to `/conventions/manage/events/[eventId]/applications` next to the field config link. Show it when event is in `reviewing` or `results_published` status.
- Manage dashboard: add `results_published: { label: "Results Published", variant: "default" }` to STATUS_LABELS
- Status controls: show "Results Published" badge when status is `results_published` (no action button — it's a terminal state)

**Verification:** `npm run build` succeeds; event detail page shows review link
**Depends on:** 1

### 4. Applicant list page with templates and publish
The main review page showing all applicants, response templates, and the publish action.

**Requirements:** REQ-1, REQ-2, REQ-3, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-18, REQ-23

**Files:**
- `src/app/conventions/manage/events/[eventId]/applications/page.tsx` — new: server component
- `src/components/conventions/response-templates-form.tsx` — new: client form for acceptance/rejection message templates
- `src/components/conventions/publish-results-button.tsx` — new: client component for publish action
- `src/components/conventions/applicant-list.tsx` — new: client component for the applicant entries with payment/revoke controls

**Approach:**
- Server page:
  - Auth check, fetch event via `getOrganizerEvent`
  - Fetch all applications for this event, join with `conventionArtistLists` to get allow/block flags
  - Extract display data from `profileSnapshot` (displayName from JSONB, not from current profile)
  - Fetch other events for this convention (for template copy feature)
  - Pass data to client components
- Response templates form:
  - `useActionState` with `updateResponseTemplates`
  - Two Textarea fields: acceptance message, rejection message
  - "Copy from..." select (same pattern as field config copy)
  - Only editable when event is in `reviewing` status (before publish)
- Applicant list:
  - Each row: display name (from snapshot), date submitted, decision badge (Undecided/Accepted/Rejected), allow-list badge, block-list badge
  - Rows link to `/conventions/manage/events/[eventId]/applications/[applicationId]`
  - Post-publish: show payment status column (Unpaid/Paid) for accepted applications, with toggle button
  - Post-publish: show "Revoke" option for accepted applications
- Publish button:
  - Count undecided applications
  - If any undecided: show warning with count, disable button
  - If all decided: enabled "Publish Results" button
  - After publish: show "Results Published" badge instead of button
  - Uses `useActionState` with `publishResults`

**Verification:** `npm run build` succeeds; page renders at `/conventions/manage/events/[eventId]/applications`
**Depends on:** 2

### 5. Applicant detail page with snapshot and actions
Individual applicant review page showing the full profile snapshot, portfolio gallery, and accept/reject controls.

**Requirements:** REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-9

**Files:**
- `src/app/conventions/manage/events/[eventId]/applications/[applicationId]/page.tsx` — new: server component
- `src/components/conventions/application-decision-controls.tsx` — new: client component for accept/reject buttons

**Approach:**
- Server page:
  - Auth check, verify event ownership
  - Fetch application by ID, verify it belongs to this event
  - Extract `profileSnapshot` — render all profile fields (displayName, realName, contactEmail, phone, bio, websiteUrl, socialLinks, helpers, accessibilityNeeds, tableSizePreference, notes)
  - Render portfolio images from `snapshot.images` array — resolve each `storagePath` via `storage.getUrl()`, display in a responsive grid
  - Application history: query all applications where `profileId = this application's profileId` AND `events.conventionId = this event's conventionId`, joined with events to get event name and date. Show as a list: event name, date applied, status.
  - Back link to applications list
- Decision controls (`"use client"`):
  - Props: `applicationId`, `eventId`, `currentStatus`, `eventStatus`
  - When event is `reviewing`: show "Accept" and "Reject" buttons. The currently selected decision is highlighted. Clicking the other button toggles.
  - When event is `results_published`: show status as read-only badge (no toggle)
  - Uses `useActionState` with `setApplicationDecision`

**Verification:** `npm run build` succeeds; page renders with snapshot data and gallery
**Depends on:** 2, 4

### 6. Update artist dashboard — status masking + revoked status
Modify the dashboard to mask in-progress decisions and add the revoked status.

**Requirements:** REQ-19, REQ-22

**Files:**
- `src/app/dashboard/page.tsx` — modify: add status masking logic and `revoked` to STATUS_STYLES

**Approach:**
- Add `revoked` to STATUS_STYLES: `{ label: "Revoked", variant: "destructive" }`
- Modify the application query: also select `events.status` as `eventStatus`
- In the render logic, compute the display status:
  - If `eventStatus === "reviewing"` and `app.status !== "submitted"`: display "Under Review"
  - If `eventStatus === "results_published"`: display the actual `app.status`
  - Otherwise: display `app.status` as-is
- This means artists see: "Submitted" → "Under Review" (while organizer is deciding) → actual result after publish

**Verification:** `npm run build` succeeds; artist dashboard shows correct masked statuses
**Depends on:** 1

### 7. Tests
Write integration tests for review actions and update test helpers.

**Requirements:** Infrastructure

**Files:**
- `__tests__/helpers/db.ts` — modify: add `createTestApplication` helper
- `__tests__/integration/application-review.test.ts` — new: tests for review workflow
- `__tests__/integration/publish-results.test.ts` — new: tests for publish action

**Approach:**
- Add `createTestApplication(eventId, profileId, overrides?)` helper — inserts an application with a minimal profileSnapshot
- Review tests (`application-review.test.ts`):
  - `setApplicationDecision` accepts an application
  - `setApplicationDecision` rejects an application
  - Decision can be toggled (accept then reject)
  - Rejects when event is not in reviewing status
  - Rejects for non-organizer
  - `confirmPayment` toggles payment status (post-publish)
  - `revokeApplication` changes status to revoked with message
  - Revoke only works on accepted applications post-publish
- Publish tests (`publish-results.test.ts`):
  - Publishes when all applications have decisions
  - Rejects publish when undecided applications exist
  - Sets responseMessage on each application from event templates
  - Changes event status to `results_published`
  - Rejects publish for non-reviewing events
- Mock `@/lib/auth` and `next/cache` as in existing tests
- Mock `@/lib/storage` for any snapshot-related operations

**Verification:** `npm test` — all tests pass
**Depends on:** 1, 2

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 4 |
| REQ-2 | 4 |
| REQ-3 | 4 |
| REQ-4 | 4, 5 |
| REQ-5 | 5 |
| REQ-6 | 5 |
| REQ-7 | 5 |
| REQ-8 | 2, 5 |
| REQ-9 | 2, 5 |
| REQ-10 | 2, 4 |
| REQ-11 | 2, 4 |
| REQ-12 | 4 |
| REQ-13 | 4 |
| REQ-14 | 1, 2, 4 |
| REQ-15 | 2, 4 |
| REQ-16 | 4 |
| REQ-17 | 1, 2 |
| REQ-18 | 4 |
| REQ-19 | 6 |
| REQ-20 | 1, 2, 4 |
| REQ-21 | 1, 2, 4 |
| REQ-22 | 6 |
| REQ-23 | 4 |

## Risks

- **Enum extension migration**: PostgreSQL's `ALTER TYPE ... ADD VALUE` cannot run inside a transaction. Drizzle may generate this in a way that requires special handling. If the migration fails, it may need to be run as a raw SQL statement outside Drizzle's migration runner.
- **Publish atomicity**: The publish action updates multiple application rows + the event status in a transaction. If the event has many applications, this could be a long-running transaction. Acceptable for MVP but worth monitoring.
- **Status masking complexity**: The artist dashboard now needs to join events to check event status. This adds a small query complexity but the join already exists from Phase 4.
