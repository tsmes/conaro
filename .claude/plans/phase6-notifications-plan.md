# Implementation Plan: Phase 6 — Notification System

Spec: `.claude/plans/phase6-notifications-spec.md`

## Technical Decisions

- **New `notifications` table**: `id`, `recipientProfileId` (FK to profiles), `type` (pgEnum: `event_opened`, `new_event`, `results_published`, `application_revoked`, `new_application`), `message` (text), `link` (text, nullable), `isRead` (boolean, default false), `createdAt`. Index on `(recipientProfileId, isRead)`.
- **New `notification_preferences` table**: `id`, `profileId` (FK to profiles), `notificationType` (same enum), `emailEnabled` (boolean, default false). Unique on `(profileId, notificationType)`.
- **Notification service**: Centralized `createNotifications()` in `src/lib/notifications/service.ts`. Determines recipients, deduplicates, batch-inserts in-app records, checks email prefs, calls email adapter.
- **Email adapter**: `EmailAdapter` interface with `sendEmail(to, subject, body, link)`. Dev `ConsoleEmailAdapter` logs to console. Singleton export matching StorageAdapter pattern.
- **API routes**: `GET /api/notifications` (list + count), `POST /api/notifications/read` (mark one), `POST /api/notifications/read-all` (mark all).
- **Notifications page at `/notifications`**: Full page listing. Bell icon in header links here.
- **NotificationBell client component**: Polls every 30 seconds for unread count, shows badge.
- **Preferences page at `/settings/notifications`**: Both roles. Header gets "Settings" link.
- **Trigger integration**: Type-specific helpers (`notifyEventOpened`, `notifyResultsPublished`, etc.) called from existing actions after success.
- **Follower + "any new event" deduplication**: UNION query, deduplicate by profileId.

## Tasks

### 1. Database schema: notifications + notification_preferences + migration
Create the two new tables and generate migration.

**Requirements:** Infrastructure (enables all REQs)

**Files:**
- `src/lib/db/schema/notifications.ts` — new: notifications table + notification_preferences table + notificationType enum
- `src/lib/db/schema/index.ts` — modify: add exports

**Approach:**
- Define `notificationTypeEnum` pgEnum: `event_opened`, `new_event`, `results_published`, `application_revoked`, `new_application`
- Notifications table: `id` (text PK uuid), `recipientProfileId` (FK profiles.id CASCADE), `type` (enum), `message` (text NOT NULL), `link` (text nullable), `isRead` (boolean default false NOT NULL), `createdAt` (timestamp default now)
- Composite index on `(recipientProfileId, isRead)` for fast unread queries
- Notification preferences table: `id` (text PK uuid), `profileId` (FK profiles.id CASCADE), `notificationType` (enum), `emailEnabled` (boolean default false NOT NULL). Unique on `(profileId, notificationType)`
- Generate and apply migration to dev + test databases

**Verification:** Migration applies cleanly; `npm run build` succeeds
**Depends on:** none

### 2. Email adapter with dev placeholder
Build the email sending abstraction with console logging.

**Requirements:** REQ-12

**Files:**
- `src/lib/email/types.ts` — new: `EmailAdapter` interface
- `src/lib/email/console.ts` — new: `ConsoleEmailAdapter` that logs to console
- `src/lib/email/index.ts` — new: singleton export

**Approach:**
- `EmailAdapter` interface: `sendEmail(to: string, subject: string, body: string, link: string): Promise<void>`
- `ConsoleEmailAdapter`: logs `[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body} | Link: ${link}` to console
- Export singleton `emailAdapter` from index.ts — same swap pattern as `storage`

**Verification:** `npm run build` compiles
**Depends on:** none

### 3. Notification service: create + query + preferences
Core notification logic — creating notifications, checking preferences, sending emails.

**Requirements:** REQ-2, REQ-3, REQ-15

**Files:**
- `src/lib/notifications/service.ts` — new: `createNotifications()`, `getNotificationsForProfile()`, `getUnreadCount()`, `markAsRead()`, `markAllAsRead()`, `getEmailPreference()`

**Approach:**
- `createNotifications(recipients: Array<{ profileId: string; type: NotificationType; message: string; link?: string }>)`:
  - Batch-insert notification rows
  - For each recipient, check their email preference for this type
  - If emailEnabled: look up user email via profiles→users join, call `emailAdapter.sendEmail()`
- `getNotificationsForProfile(profileId, limit?)`: query notifications ordered by createdAt desc, return with unread count
- `getUnreadCount(profileId)`: count where recipientProfileId = profileId AND isRead = false
- `markAsRead(notificationId, profileId)`: update isRead = true where id AND recipientProfileId match (ownership check)
- `markAllAsRead(profileId)`: update all unread for this profile
- `getEmailPreference(profileId, type)`: query notification_preferences, return emailEnabled (default false if no row)

**Verification:** `npm run build` compiles
**Depends on:** 1, 2

### 4. Notification trigger helpers
Type-specific functions that resolve recipients and call createNotifications.

**Requirements:** REQ-16, REQ-17, REQ-18, REQ-19

**Files:**
- `src/lib/notifications/triggers.ts` — new: `notifyEventOpened()`, `notifyResultsPublished()`, `notifyApplicationRevoked()`, `notifyNewApplication()`

**Approach:**
- `notifyEventOpened(eventId: string, eventName: string, conventionId: string)`:
  - Query `conventionFollows` where conventionId — get all follower profileIds
  - Query `notification_preferences` where type = `new_event` AND emailEnabled = true — get all profileIds with "any new event" enabled
  - UNION and deduplicate by profileId
  - Create notifications with type `event_opened` for followers, `new_event` for the any-new-event artists
  - Message: "Applications are now open for {eventName}"
  - Link: `/events/{eventId}`
- `notifyResultsPublished(eventId: string, eventName: string)`:
  - Query all applications for this event — get each profileId
  - Create notifications with type `results_published`
  - Message: "Results have been published for {eventName}"
  - Link: `/dashboard`
- `notifyApplicationRevoked(applicationProfileId: string, eventName: string)`:
  - Single recipient
  - Create notification with type `application_revoked`
  - Message: "Your application to {eventName} has been revoked"
  - Link: `/dashboard`
- `notifyNewApplication(conventionOrganizerId: string, artistName: string, eventId: string, eventName: string)`:
  - Single recipient (the organizer's profileId)
  - Create notification with type `new_application`
  - Message: "{artistName} applied to {eventName}"
  - Link: `/conventions/manage/events/{eventId}/applications`

**Verification:** `npm run build` compiles
**Depends on:** 3

### 5. Integrate triggers into existing actions
Wire up notification triggers in the existing server actions.

**Requirements:** REQ-16, REQ-17, REQ-18, REQ-19

**Files:**
- `src/app/conventions/manage/events/actions.ts` — modify: call `notifyEventOpened` after `openApplications` succeeds
- `src/app/conventions/manage/events/[eventId]/applications/actions.ts` — modify: call `notifyResultsPublished` after `publishResults` succeeds, call `notifyApplicationRevoked` after `revokeApplication` succeeds
- `src/app/events/[eventId]/actions.ts` — modify: call `notifyNewApplication` after `applyToEvent` succeeds

**Approach:**
- In each action, after the DB operation succeeds and before `revalidatePath`:
  - Import the relevant trigger function
  - Call it with the required parameters (eventId, eventName, conventionId, etc.)
  - Wrap in try/catch — notification failures should NOT fail the main action. Log errors but return success.
- For `openApplications`: need to fetch event name and conventionId from the event object (already available)
- For `publishResults`: need eventName (fetch from event)
- For `revokeApplication`: need artistProfileId (from the application) and eventName
- For `applyToEvent`: need organizer's profileId (query convention → organizerId), artist name (from profile.displayName), eventId, eventName

**Verification:** `npm run build` compiles; existing tests still pass
**Depends on:** 4

### 6. Notification API routes
API endpoints for polling notifications and marking as read.

**Requirements:** REQ-7, REQ-9, REQ-10, REQ-11

**Files:**
- `src/app/api/notifications/route.ts` — new: GET handler returning notifications + unread count
- `src/app/api/notifications/read/route.ts` — new: POST handler to mark one as read
- `src/app/api/notifications/read-all/route.ts` — new: POST handler to mark all as read

**Approach:**
- `GET /api/notifications`:
  - Auth check (any logged-in user)
  - Call `getNotificationsForProfile(profileId, 50)` — limit to 50 most recent
  - Call `getUnreadCount(profileId)`
  - Return `{ notifications: [...], unreadCount: number }`
- `POST /api/notifications/read`:
  - Auth check
  - Parse body: `{ notificationId: string }`
  - Call `markAsRead(notificationId, profileId)` — profileId ensures ownership
  - Return `{ success: true }`
- `POST /api/notifications/read-all`:
  - Auth check
  - Call `markAllAsRead(profileId)`
  - Return `{ success: true }`

**Verification:** `npm run build` compiles
**Depends on:** 3

### 7. Notification preferences actions
Server action for saving notification preferences.

**Requirements:** REQ-1, REQ-3, REQ-4, REQ-5

**Files:**
- `src/app/settings/notifications/actions.ts` — new: `updateNotificationPreferences` server action

**Approach:**
- Auth check (any logged-in user)
- Parse formData: for each notification type relevant to the user's role, get the emailEnabled value (checkbox "on"/"off")
- Artist types: `event_opened`, `new_event`, `results_published`, `application_revoked`
- Organizer types: `new_application`
- For each type: upsert into `notification_preferences` using `onConflictDoUpdate` on the `(profileId, notificationType)` unique constraint
- Revalidate settings page

**Verification:** `npm run build` compiles
**Depends on:** 1

### 8. Notification bell component + header update
Client component that polls for unread count and shows badge in the header.

**Requirements:** REQ-6, REQ-11

**Files:**
- `src/components/notifications/notification-bell.tsx` — new: client component
- `src/components/layout/header.tsx` — modify: add NotificationBell + Settings link

**Approach:**
- NotificationBell (`"use client"`):
  - Uses `useState` for `unreadCount` and `useEffect` + `setInterval` for polling
  - Fetches `GET /api/notifications` every 30 seconds (and on mount)
  - Renders a bell icon (use a simple SVG or emoji) with a Badge showing unread count when > 0
  - Wraps in a Link to `/notifications`
  - No polling when tab is not visible (use `document.visibilityState` check)
- Header update:
  - Import and render `<NotificationBell />` before `<LogoutButton />` for authenticated users (both roles)
  - Add a "Settings" link to `/settings/notifications` (use a gear icon or text link)

**Verification:** `npm run build` succeeds; bell renders in header
**Depends on:** 6

### 9. Notifications page
Full page listing all notifications with read/unread state and mark-as-read.

**Requirements:** REQ-7, REQ-8, REQ-9, REQ-10

**Files:**
- `src/app/notifications/page.tsx` — new: server component fetching notifications
- `src/components/notifications/notification-list.tsx` — new: client component rendering the list with mark-as-read interactions

**Approach:**
- Server page:
  - Auth check (redirect to /login if not logged in)
  - Fetch notifications via `getNotificationsForProfile(profileId, 50)`
  - Pass to client component
- Notification list (`"use client"`):
  - Renders notifications in a vertical list
  - Each item: message, relative timestamp (e.g., "2 hours ago" or ISO date), read/unread styling (unread = bold/highlighted background)
  - Clicking a notification: calls `POST /api/notifications/read` with the notificationId, then navigates to `notification.link` via `router.push()`
  - "Mark all as read" button at the top: calls `POST /api/notifications/read-all`, then refreshes the list
  - Empty state: "No notifications yet"

**Verification:** `npm run build` succeeds; page renders at `/notifications`
**Depends on:** 6

### 10. Notification preferences page
Settings page for configuring email notification toggles.

**Requirements:** REQ-1, REQ-3, REQ-4, REQ-5

**Files:**
- `src/app/settings/notifications/page.tsx` — new: server component
- `src/components/notifications/notification-preferences-form.tsx` — new: client form

**Approach:**
- Server page:
  - Auth check
  - Fetch current preferences for this profileId from notification_preferences table
  - Determine which types to show based on role:
    - Artist: `event_opened`, `new_event`, `results_published`, `application_revoked`
    - Organizer: `new_application`
  - Pass current preferences + available types to form component
- Preferences form (`"use client"`):
  - `useActionState` with `updateNotificationPreferences`
  - For each notification type: label + Checkbox for email toggle
  - Note: "In-app notifications are always enabled"
  - Save button
  - Pre-fill checkboxes from current preferences (default: all off)

**Verification:** `npm run build` succeeds; page renders at `/settings/notifications`
**Depends on:** 1, 7

### 11. Update test helpers + write tests
Update cleanDatabase, add helpers, write integration tests for the notification service and triggers.

**Requirements:** Infrastructure

**Files:**
- `__tests__/helpers/db.ts` — modify: add notifications + notification_preferences to cleanDatabase, add helpers
- `__tests__/integration/notifications.test.ts` — new: tests for notification service + triggers
- `__tests__/integration/notification-preferences.test.ts` — new: tests for preferences

**Approach:**
- Update `cleanDatabase()`: add `await db.delete(notifications)` and `await db.delete(notificationPreferences)` at the top (before applications, since notifications FK to profiles not applications)
- Add helpers: `findNotificationsByProfileId(profileId)`, `createTestNotificationPreference(profileId, type, emailEnabled)`
- Notification tests:
  - `notifyEventOpened`: creates notifications for followers
  - `notifyEventOpened`: includes artists with "any new event" preference
  - `notifyEventOpened`: deduplicates followers who also have "any new event"
  - `notifyResultsPublished`: creates notifications for all applicants
  - `notifyApplicationRevoked`: creates notification for affected artist
  - `notifyNewApplication`: creates notification for organizer
  - Email adapter called when emailEnabled is true
  - Email adapter NOT called when emailEnabled is false
- Preference tests:
  - `updateNotificationPreferences`: saves preferences
  - Preferences persist after save
  - Rejects non-authenticated users

**Verification:** `npm test` — all tests pass
**Depends on:** 1, 2, 3, 4, 7

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 7, 10 |
| REQ-2 | 3 (in-app always created) |
| REQ-3 | 3, 7, 10 |
| REQ-4 | 7, 10 |
| REQ-5 | 7, 10 |
| REQ-6 | 8 |
| REQ-7 | 6, 9 |
| REQ-8 | 9 |
| REQ-9 | 6, 9 |
| REQ-10 | 6, 9 |
| REQ-11 | 8 |
| REQ-12 | 2 |
| REQ-13 | 4, 5 |
| REQ-14 | 4 |
| REQ-15 | 3, 4 |
| REQ-16 | 4, 5 |
| REQ-17 | 4, 5 |
| REQ-18 | 4, 5 |
| REQ-19 | 4, 5 |

## Risks

- **Notification volume on publish**: Publishing results for an event with many applicants creates one notification per applicant in a single action. This is a batch insert + potentially many email sends. For MVP this is acceptable but could be slow for large events. Consider background processing later.
- **Polling overhead**: Every authenticated user polls every 30 seconds. With many concurrent users, this creates steady API load. The query is indexed (`recipientProfileId, isRead`) so it's fast, but worth monitoring.
- **Email adapter swap**: The console adapter is a placeholder. When swapping to Resend, the only change is the adapter implementation — the interface is clean. But email deliverability, rate limits, and error handling will need attention at that point.
- **Notification cleanup**: No mechanism to delete old notifications. Over time, the notifications table will grow. This is fine for MVP but a cleanup job should be added later (e.g., delete read notifications older than 90 days).
