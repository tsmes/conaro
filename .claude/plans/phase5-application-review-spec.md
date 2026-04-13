# Phase 5 — Application Review

## Problem Statement

Convention organizers can accept applications and transition events to "reviewing" status, but have no way to see applicants, review their portfolios, make accept/reject decisions, or communicate results. Phase 5 builds the review workflow: organizers view the applicant list, review snapshots, accept or reject each applicant, configure response messages, and publish all results at once — making decisions visible to artists simultaneously. After publishing, organizers track payment for accepted artists and can revoke approval for non-payment.

## Requirements

- [REQ-1] Organizers can view a list of all applications for a specific event, showing artist display name, date submitted, and current decision status (Undecided / Accepted / Rejected)
- [REQ-2] Allow-listed artists are visually flagged in the applicant list
- [REQ-3] Block-listed artists are visually flagged in the applicant list
- [REQ-4] Clicking an applicant navigates to their full review detail page
- [REQ-5] The applicant detail view shows the profile snapshot at time of application (not current profile)
- [REQ-6] Portfolio images from the snapshot are displayed in a gallery/grid
- [REQ-7] The organizer can view the artist's application history with this convention (previous events and their outcomes)
- [REQ-8] Organizers can accept or reject each applicant from the detail view
- [REQ-9] Decisions can be changed (toggled between accept/reject) before publishing results
- [REQ-10] Decision status updates immediately in the applicant list
- [REQ-11] Organizers can write a custom acceptance message and rejection message per event
- [REQ-12] Messages support line breaks
- [REQ-13] Organizers can copy response templates from a previous event as a starting point
- [REQ-14] Organizers can publish results for an event in a single action, making all decisions visible to artists simultaneously
- [REQ-15] Publishing is only available when every applicant has a decision (accepted or rejected)
- [REQ-16] A warning is shown if any applicants are still undecided
- [REQ-17] On publish, each artist's application gets the appropriate response message (from the event's template) and the event status changes to "Results Published"
- [REQ-18] Publishing cannot be undone
- [REQ-19] Before results are published, artists see "Under Review" on their dashboard (not the organizer's in-progress decisions)
- [REQ-20] After publishing, organizers can mark accepted artists as "Paid" (manual payment confirmation)
- [REQ-21] After publishing, organizers can revoke an accepted artist's approval, changing their status to "Revoked" with an organizer message
- [REQ-22] Artists see "Revoked" status on their dashboard with the organizer's message
- [REQ-23] The applicant list shows payment status for accepted artists after publishing (Unpaid / Paid)

## Scope

### In Scope

- Applicant list page per event with status, allow/block flags
- Applicant detail page with profile snapshot and portfolio gallery
- Application history across convention events
- Accept/reject actions with toggle before publish
- Response template fields (acceptance + rejection messages) on events
- Copy response templates from a previous event
- Publish results action with all-decided validation
- New event status `results_published` (migration to extend enum)
- Artist dashboard status masking: show "Under Review" until results published
- Navigation links from event detail page to review UI
- Post-publish payment tracking for accepted artists (manual paid/unpaid toggle)
- Revoke acceptance for non-payment (new `revoked` application status with message)

### Out of Scope

- Notifications on publish (Phase 6)
- Email/push notifications for status changes (Phase 6)
- Bulk accept/reject (select multiple applicants at once)
- Filtering or sorting the applicant list
- Exporting applicant data (CSV, etc.)
- Waitlist tier
- Payment processing integration (Stripe, etc.)

## Acceptance Criteria

**Applicant List**
- [ ] Event detail page (organizer) has a "Review Applications" link
- [ ] Applicant list shows all applications for the event
- [ ] Each entry shows: artist display name, date submitted, decision status (Undecided / Accepted / Rejected)
- [ ] Allow-listed artists have a visual flag/badge
- [ ] Block-listed artists have a visual flag/badge
- [ ] Clicking an applicant navigates to their detail page

**Applicant Detail**
- [ ] Shows the profile snapshot data (display name, contact email, bio, etc.) — not the artist's current profile
- [ ] Portfolio images from the snapshot are displayed in a grid
- [ ] Accept and Reject buttons are visible and functional
- [ ] Decisions can be toggled (accept then reject, or vice versa) before publishing
- [ ] Application history section shows the artist's previous applications to this convention's events (event name, date, outcome)

**Response Templates**
- [ ] Event settings include text fields for acceptance message and rejection message
- [ ] Messages preserve line breaks when displayed to artists
- [ ] Organizer can copy templates from a previous event
- [ ] Templates persist after save

**Publish Results**
- [ ] "Publish Results" button visible on the applicant list page
- [ ] Button is disabled with a warning when any applicants have no decision
- [ ] On publish: event status changes to "Results Published"
- [ ] On publish: each application's responseMessage is populated from the event's template
- [ ] After publish: artists see their actual status (Accepted/Rejected) and the response message on their dashboard
- [ ] Before publish: artists see "Under Review" regardless of the organizer's in-progress decisions
- [ ] Publishing cannot be undone — no button to revert

**Post-Publish Payment Tracking**
- [ ] Applicant list shows payment status column for accepted artists after results are published
- [ ] Organizer can mark an accepted artist as "Paid"
- [ ] Organizer can revoke an accepted artist's approval with a message
- [ ] Revoked artist sees "Revoked" status and the organizer's message on their dashboard
- [ ] Paid status persists across page reloads

## Constraints

- Response templates are stored as two text columns on the events table (`acceptanceMessage`, `rejectionMessage`)
- Event status enum needs a new value `results_published` (requires a DB migration to alter the enum)
- Application status enum needs a new value `revoked` (same migration)
- Payment tracking is a `paymentConfirmed` boolean on the applications table (not a timestamp — just paid/unpaid)
- Artist dashboard status display is gated by event status: if event is not `results_published`, show "Under Review" for any application in `reviewing` events
