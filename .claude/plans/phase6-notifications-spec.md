# Phase 6 — Notification System

## Problem Statement

Users have no way to know when something important happens — results published, applications opened, new applications received. Phase 6 adds an in-app notification system (bell icon with unread count, notification list, mark-as-read) and an email notification framework (dev placeholder, Resend-ready). Users configure which notifications they receive through a preferences page. Push notifications are deferred.

## Requirements

- [REQ-1] Users have a notification settings page accessible from the header
- [REQ-2] In-app notifications are always on (no toggle)
- [REQ-3] Email notifications are togglable per notification type
- [REQ-4] Artists can toggle: followed convention opens event, any new event opens, application status changes (results published, revoked)
- [REQ-5] Organizers can toggle: new application received
- [REQ-6] Notification bell icon in the header with unread count badge
- [REQ-7] Clicking the bell shows a dropdown/page listing notifications
- [REQ-8] Each notification shows: message, timestamp, and read/unread state
- [REQ-9] Clicking a notification navigates to the relevant page and marks it as read
- [REQ-10] "Mark all as read" action
- [REQ-11] Notifications are polled every 30 seconds from the client
- [REQ-12] Email sending infrastructure with a dev placeholder (console.log) swappable for Resend
- [REQ-13] Emails sent for: followed convention opens event (artists), results published (artists), application revoked (artists), new application received (organizers)
- [REQ-14] Emails include a link back to the relevant page
- [REQ-15] Emails only sent if the user has that email notification type enabled
- [REQ-16] When an organizer opens applications for an event: notify followers of that convention + artists with "any new event" enabled
- [REQ-17] When results are published: notify all applicants for that event
- [REQ-18] When an application is revoked: notify the affected artist
- [REQ-19] When an artist applies to an event: notify the event's convention organizer

## Scope

### In Scope

- Notifications table in PostgreSQL (message, link, read state, recipient, type)
- Notification preferences table (per-user toggles by notification type and channel)
- Notification preferences page (accessible from header for both roles)
- Notification bell icon in header with unread count badge
- Notification dropdown/list with messages, timestamps, read state
- Mark as read (on click) and mark all as read
- Client-side polling every 30 seconds for unread count
- Email sending abstraction with dev placeholder (console.log)
- Email templates for each notification type (plain text with link)
- Trigger notifications from existing actions: openApplications, publishResults, revokeApplication, applyToEvent
- Respect user preferences before creating/sending notifications

### Out of Scope

- Push notifications (Web Push API) — deferred
- Real Resend integration (just the placeholder adapter)
- Rich HTML email templates (React Email) — plain text with links for now
- Real-time updates (WebSocket/SSE) — polling only
- Notification history pagination
- Notification grouping/batching (e.g., "5 new applications" as one notification)
- Application period reminders for organizers (mentioned in PRD but deferred)

## Acceptance Criteria

**Notification Preferences**
- [ ] Settings page accessible from the header (both artist and organizer roles)
- [ ] Artists see toggles for: followed convention opens event, any new event opens, application status changes
- [ ] Organizers see toggles for: new application received
- [ ] Each toggle has an email column (in-app is always on, no toggle needed)
- [ ] Preferences persist after save and page reload
- [ ] Default preferences: all email toggles off (in-app always on)

**In-App Notifications**
- [ ] Bell icon visible in the header for logged-in users
- [ ] Unread count badge shows on the bell when there are unread notifications
- [ ] Clicking the bell shows a list of notifications (message, timestamp, read/unread styling)
- [ ] Clicking a notification navigates to the relevant page and marks it as read
- [ ] "Mark all as read" button clears all unread notifications
- [ ] Unread count updates via polling every 30 seconds without page refresh

**Email Notifications**
- [ ] When a notification is created with email enabled, the email adapter is called
- [ ] Dev placeholder logs the email to console (recipient, subject, body, link)
- [ ] Emails are only "sent" when the user has that notification type's email toggle enabled

**Notification Triggers**
- [ ] Opening applications: followers of the convention receive an in-app notification with a link to the event
- [ ] Opening applications: artists with "any new event" enabled receive an in-app notification
- [ ] Publishing results: each applicant receives an in-app notification with their result and a link to the dashboard
- [ ] Revoking an application: the affected artist receives an in-app notification
- [ ] New application: the organizer receives an in-app notification with the artist's name and a link to the review page

## Constraints

- Notifications table stores: id, recipientProfileId, type (enum), message, link, isRead, createdAt
- Notification preferences table stores: profileId, notificationType, emailEnabled (boolean). In-app is implicit (always on) — no column needed.
- Polling endpoints: `GET /api/notifications/unread-count` returns the count; `GET /api/notifications` returns the list
- Email adapter interface: `sendEmail(to, subject, body, link)` — dev implementation logs to console
