# Artist event view improvements

## Problem Statement

The artist-facing event page at `/events/[eventId]` is a single long-scroll layout that mixes status, event details, floor plan, and messaging into one stream. Three concrete issues result: (a) the status card looks visually identical for "accepted" and "rejected" outcomes, (b) artists have no quick way to find their assigned table on a busy floor plan, and (c) the page diverges from the organizer side, which uses tabs for the same conceptual sections. This addresses all three together because tabs are the natural home for a "Show me my table" interaction.

## Requirements

- [REQ-1] Artist event page is split into routed tabs matching the organizer pattern: **Details** (always), **Floor plan** (visible only when results are published and a plan exists), **Messages** (visible only to accepted artists who have a thread).
- [REQ-2] The status card ("You're in" / "Results" / "Waitlist" / "Submitted" etc.) is pinned above the tab bar so it remains visible regardless of which tab is active.
- [REQ-3] The status card is visually distinct per outcome:
  - **Accepted** — emerald-tinted background, emerald accent, check icon, celebratory copy.
  - **Rejected** — neutral muted card (no destructive red), info icon.
  - **Waitlisted** — amber-tinted background, amber accent, hourglass icon.
  - **Submitted / Under review / Pending** — current default treatment retained.
- [REQ-4] Apply form remains inline at the bottom of the **Details** tab — not a separate tab.
- [REQ-5] Logged-out and non-applicant viewers see the same tab structure with the same conditional logic; if no Floor plan or Messages tab applies, only Details is rendered.
- [REQ-6] On the floor plan, the artist's own assigned table has a stronger static highlight than today: thicker stroke and a stronger glow halo.
- [REQ-7] When the status card is shown to an accepted artist who has a table assigned, it includes a **"Show me my table"** button. Clicking it navigates to the Floor plan tab and triggers a temporary pulse animation (~2s) on the artist's table.
- [REQ-8] Floor plan tab arrives with the artist's table already in view (no manual scrolling required to find it on small viewports).

## Scope

### In Scope

- Routing changes: split `/events/[eventId]` into `/events/[eventId]` (Details), `/events/[eventId]/floor-plan`, `/events/[eventId]/messages`.
- New `ArtistEventTabsNav` client component (mirroring `EventTabsNav` shape).
- Status card redesign with per-outcome treatment.
- Stronger artist-own-table styling in `floor-plan-canvas.tsx` (visible to anyone viewing the plan when their application is the assignment).
- "Show me my table" button on the status card, with cross-tab navigation + transient pulse triggered by URL search param (e.g. `?focus=table`).
- Update existing notification deep-links and any internal links that point to the old single-page event URL to land on the right tab when contextually obvious (e.g. message notifications → `/messages` tab).

### Out of Scope

- Pan / zoom on the floor plan canvas.
- Payment confirmation UI for artists (Tier 2).
- Showing organizer announcements to waitlisted artists (Tier 2).
- Indicator that organizer has decisions but hasn't published (Tier 2).
- Any organizer-side UI changes.
- Mobile-specific layout overhauls — tabs must work on mobile but no bespoke mobile design.

## Acceptance Criteria

- [ ] Visiting `/events/[eventId]` as a logged-out user shows only the Details tab; no Floor plan or Messages tab is visible.
- [ ] Visiting `/events/[eventId]` after results are published, with a floor plan present, shows the Floor plan tab to all viewers.
- [ ] Messages tab appears only for the accepted artist whose application has a thread; other users (including other accepted artists for the same event) do not see it.
- [ ] The status card sits above the tab bar and remains visible after switching tabs.
- [ ] Accepted, rejected, and waitlisted status cards are visually distinguishable at a glance — accepted is clearly celebratory, rejected is neutral, waitlisted is amber.
- [ ] On the floor plan, an accepted artist's own table is visibly more prominent than other assigned tables (thicker stroke, stronger glow).
- [ ] Clicking "Show me my table" on the status card navigates to the Floor plan tab and the artist's table briefly pulses for ~2 seconds, then settles back to its strong static highlight.
- [ ] The button only appears for accepted artists who have a table assigned.
- [ ] Apply form continues to work as today and is reachable from the Details tab.
- [ ] Existing in-app notifications that link to a thread message land on the Messages tab.

## Constraints

- Must follow the existing organizer tab pattern (server-routed sub-pages, `Link`-based nav) for consistency — see `src/components/conventions/event-tabs-nav.tsx`.
- Must not break URLs already shared in notifications or emails — the existing `/events/[eventId]` URL stays valid as the Details tab.
- Floor plan canvas changes must not regress the organizer editor (same component renders in both contexts).
