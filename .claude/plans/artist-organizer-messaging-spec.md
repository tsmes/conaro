# Q&A messaging between artists and organizers

## Problem Statement
Organizers can broadcast announcements to accepted artists, but there's no path for artists to ask questions back — table placement, spot logistics, payment, etc. Today those conversations happen off-app, outside the organizer's operational tooling and invisible to anyone stepping in.

## Requirements
- **REQ-1** An artist whose `applications.status` is `accepted` on an event can post a message to the organizer from the public event page.
- **REQ-2** Each (artist × event) pair has a single private thread. All of that artist's questions for that event live in one timeline.
- **REQ-3** No other artist can see anyone else's thread or its messages.
- **REQ-4** The organizer sees, on the event management page, an inbox listing every artist with an open thread — most-recently-active first, with an unread marker per thread.
- **REQ-5** Replies are private by default. The reply composer has an "Also post as announcement" toggle; when ticked, publishing the reply additionally creates a new `event_announcements` row with the same body.
- **REQ-6** A new message in either direction creates a notification via the existing notification system (in-app row + email if the recipient has `emailEnabled` for the new type). In-app notifications deep-link to the relevant surface (artist → event page thread; organizer → inbox thread).
- **REQ-7** Each thread tracks unread state per participant so both sides get a new-message indicator until they open the thread.
- **REQ-8** Q&A and announcement visibility share the same gate: `accepted` only. Artists promoted from waitlisted automatically gain both surfaces once their status flips (no backfill, no special logic).

## Scope

### In Scope
- New thread + messages schema.
- Artist-side "Ask the organizer" composer on the public event page, gated on `status === "accepted"`.
- Organizer-side inbox + thread view on the event management page.
- Organizer reply composer with optional "Also post as announcement" toggle.
- Notifications for new messages in both directions via a new `notification_type` value.
- Read/unread state per participant per thread.
- Plain-text message bodies (same treatment as announcements today).

### Out of Scope
- Rich-text / markdown on thread messages.
- Attachments, image uploads, link previews.
- Multi-organizer routing or per-role assignment.
- Artist-to-artist messaging.
- Thread subjects / topics (one timeline per artist per event; no sub-threading).
- Search across threads, archiving, closing, editing, deleting, or reactions.
- Q&A access for waitlisted or rejected artists.

## Acceptance Criteria

**Artist side**
- [ ] Accepted artist sees an "Ask the organizer" composer + any prior thread on the public event page.
- [ ] Waitlisted, rejected, or unapplied viewers do NOT see the composer.
- [ ] Sending a question displays the full thread timeline immediately without a full page reload.
- [ ] Next visit shows any organizer replies, with an unread indicator until the artist opens the section.

**Organizer side**
- [ ] Event management page shows a "Questions from artists" card with each artist's thread, sorted by most-recent activity, with unread markers.
- [ ] Clicking an artist opens their full thread; organizer can read history + post a reply.
- [ ] Reply composer has an "Also post as announcement" checkbox. Ticking it creates an announcement with the same body on publish, while the private reply is delivered normally.

**Notifications**
- [ ] Artist sends a message → organizer gets an in-app notification linking to the thread.
- [ ] Organizer replies → artist gets an in-app notification linking to the event page.
- [ ] Email delivery follows the existing per-type `notificationPreferences.emailEnabled` model.

**Announcements (unchanged)**
- [ ] Visibility stays accepted-only. Promoting a waitlisted artist to accepted surfaces the full announcement history on next visit — no special code needed.

## Constraints
- Reuse existing auth (`session.user.role`, `profileId`) and notifications plumbing — no new email infrastructure.
- Thread membership is keyed on `(eventId, artistProfileId)`; no separate membership table.
