# Implementation Plan: Landing Page Redesign

Spec: `.claude/plans/landing-page-redesign-spec.md`

## Technical Decisions

- **Filter state via URL search params** (`?filter=...`, `?country=...`). Matches the existing `/events` convention, keeps the page server-rendered for SSR/SEO, and avoids turning the whole component tree into a client boundary. Filter chips are `next/link` `<Link>` components that highlight based on current params.
- **Server components by default.** Only already-interactive units remain client: `NotificationList` (existing) and a small `FollowButton` wrapper that calls the existing `toggleFollow` server action with `revalidatePath("/")`.
- **Cover gradients as CSS utilities.** Six `.cover-a` … `.cover-f` classes added to `globals.css`, modelled on the design's radial gradients. A pure `pickCoverGradient(conventionId)` function picks one deterministically via a tiny string hash.
- **Extract `formatRelativeTime`** from `src/components/notifications/notification-list.tsx:21-34` into `src/lib/utils/format-relative-time.ts` so both the notifications list and the artist rail can share it without duplication.
- **Reuse existing components.** `CompletenessIndicator` and `NotificationList` drop into the artist rail as-is. `toggleFollow` from `src/app/(public)/conventions/[conventionId]/actions.ts` wires the card's Follow button.
- **New files under `src/components/landing/`** for presentational components; data-fetching helpers under `src/lib/landing/data.ts`. Keeps the landing page self-contained and prevents leakage into unrelated modules.

## Tasks

### 1. Cover gradient utilities and picker

Add the six CSS utility classes for event-card cover rails and a deterministic picker keyed by convention id.

**Requirements:** Infrastructure (supports REQ-16)

**Files:**
- `src/app/globals.css` — add six `@utility` blocks (or plain class rules consistent with existing utilities in the file) for `.cover-a` … `.cover-f`, using radial gradients from the design's palette and reusing the Curator's Canvas colour tokens where possible.
- `src/lib/landing/cover-gradient.ts` — new file exporting `pickCoverGradient(conventionId: string): "cover-a" | "cover-b" | "cover-c" | "cover-d" | "cover-e" | "cover-f"`.
- `__tests__/unit/lib/landing/cover-gradient.test.ts` — new file.

**Approach:**
- Port the six `.cover-*` definitions from `/tmp/design-pkg/conaro/project/Dashboard.html:73-78` verbatim (colour stops work in both themes).
- Picker: sum char codes of `conventionId` modulo 6, return the matching class name.
- Tests: deterministic (same id → same class across calls); distribution smoke-check (six sample ids produce multiple different classes).

**Verification:** `npm test -- cover-gradient`; view `/globals.css` in dev server, inspect an element with `cover-a` to confirm gradient renders.
**Depends on:** none

---

### 2. Shared relative-time utility

Extract the local `formatRelativeTime` function so it can be reused in the landing page's notifications rail card without duplication.

**Requirements:** Infrastructure (supports REQ-22)

**Files:**
- `src/lib/utils/format-relative-time.ts` — new file; export `formatRelativeTime(input: string | Date): string`.
- `src/components/notifications/notification-list.tsx` — remove local helper; import from the new module.
- `__tests__/unit/lib/utils/format-relative-time.test.ts` — new file.

**Approach:**
- Copy the function body from `notification-list.tsx:21-34`, accept `string | Date`, coerce to `Date` internally.
- Tests: "Just now" for <60s, "Xm ago" for <60m, "Xh ago" for <24h, "Xd ago" for <7d, ISO date thereafter. Use a fixed reference date.

**Verification:** `npm test -- format-relative-time`; run the app and open `/notifications` to confirm the list still formats times correctly.
**Depends on:** none

---

### 3. Landing-page data helpers

Centralise the Drizzle queries the landing page needs so `page.tsx` stays thin.

**Requirements:** REQ-3, REQ-4, REQ-10, REQ-11 (data subsets), REQ-22 (data for quick-status card)

**Files:**
- `src/lib/landing/data.ts` — new file.
- `__tests__/integration/lib/landing/data.test.ts` — new file, uses the existing test DB harness.

**Approach:**
- Export three functions, each documented with its return shape:
  1. `getUpcomingEvents()` — mirrors the join in `src/app/(public)/events/page.tsx:30-52` but without the convention filter. Returns `LandingEvent[]` (id, conventionId, conventionName, conventionLogoPath, name, status, eventStartDate, eventEndDate, applicationOpenDate, applicationCloseDate, venueCity, venueCountry, availableStands). Sorted by `event_start_date ASC` (per REQ-3, not by close-date like `/events`).
  2. `getArtistContext(profileId: string)` — returns `{ followedConventionIds: Set<string>, applicationsByEventId: Map<string, { status, applicationId }>, counts: { total, accepted, underReview, following } }`. Uses two queries (applications, convention_follows) and derives counts in TS.
  3. `getLatestNotifications(profileId: string, limit = 3)` — thin query over `notifications` ordered by `createdAt DESC`.
- Integration test: seeds a few events/conventions/applications/follows, calls each function, asserts expected shape.

**Verification:** `npm test -- lib/landing/data`; type-check passes.
**Depends on:** none

---

### 4. EventCover component

The left cover rail on event cards and the hero image on the featured event.

**Requirements:** REQ-13 (hero cover), REQ-16 (card cover)

**Files:**
- `src/components/landing/event-cover.tsx` — new file.
- `__tests__/unit/components/landing/event-cover.test.tsx` — new file.

**Approach:**
- Props: `{ conventionId: string; conventionName: string; logoPath: string | null; eventStartDate: string; variant: "card" | "hero"; className?: string }`.
- Render: outer div with either `bg-cover bg-center` + inline background-image when `logoPath` is set (use `storage.getUrl(logoPath)`), otherwise `pickCoverGradient(conventionId)` class.
- Overlay: convention initials avatar (top-left for card variant, small for hero) + date stamp (month abbreviation + day, big sans-heading numeral) at bottom-left for cards or inline for the hero.
- `variant="card"` → fixed width (128px) on `sm+`, hidden below `sm`. `variant="hero"` → grid cell sized by parent.
- Tests: logo path renders background image; no logo renders gradient class; date stamp formats correctly.

**Verification:** `npm test -- event-cover`; visual check in dev server via a Storybook-free approach (just render the component inline in a test page if needed during implementation).
**Depends on:** 1 (picker), 3 (event type)

---

### 5. EventCard and context strip

The primary listing element with the artist context strip.

**Requirements:** REQ-17, REQ-18, REQ-19, REQ-20

**Files:**
- `src/components/landing/event-card.tsx` — new file.
- `src/components/landing/event-context-strip.tsx` — new file.
- `src/components/landing/follow-button.tsx` — new client component that wraps `toggleFollow`.
- `__tests__/unit/components/landing/event-card.test.tsx` — new file.
- `__tests__/unit/components/landing/event-context-strip.test.tsx` — new file.

**Approach:**
- `<EventCard>` props: `{ event: LandingEvent; viewer: "public" | "artist"; artistContext?: ArtistEventContext }` where `ArtistEventContext = { applicationStatus: ApplicationStatus | null; isFollowingConvention: boolean; applicationId?: string }`.
- Card surface wraps content in a `next/link` to `/events/{id}`. Footer buttons use `onClick={e => e.stopPropagation()}` — or better, render action buttons outside the Link and make the card body itself the Link. Use two sibling elements inside a `Card`: `<Link>` content + `<div>` footer. Footer is `flex items-center gap-2 border-t`.
- Body: cover rail on the left (`<EventCover variant="card">`), body on the right with convention name, event name, date range, venue city + country, optional status + follow badges.
- Context strip appears only when `viewer === "artist"` and context has an application OR the event is an open call to a followed convention. Strip styling uses the primary-container tokens that already exist in `globals.css`.
- Context messages mapped from `applicationStatus` per REQ-18. "Submitted" message computes `Nd` from `application_close_date`.
- Footer actions per REQ-19.
- `<FollowButton>` is a client component: `"use client"`, takes `{ conventionId, isFollowing }`, calls `toggleFollow` in a `useTransition`. Revalidates `/` via the server action's own `revalidatePath` (add `revalidatePath("/")` inside the action if not already there; check during implementation).
- Tests:
  - Card renders status badge when application present; hides it when absent.
  - Context strip shows correct copy for each application status.
  - Footer: public viewer sees "View event" only. Artist + open-call sees "View event" + "Apply". Artist + application sees "View event" + "View application".

**Verification:** `npm test -- event-card event-context-strip`; dev-server smoke check.
**Depends on:** 3, 4

---

### 6. FeaturedEvent component

The hero card shown above the event list.

**Requirements:** REQ-12, REQ-13, REQ-14, REQ-15

**Files:**
- `src/components/landing/featured-event.tsx` — new file.
- `__tests__/unit/components/landing/featured-event.test.tsx` — new file.

**Approach:**
- Props: `{ event: LandingEvent; viewer: "public" | "artist"; artistContext?: ArtistEventContext }`.
- Layout: `grid md:grid-cols-[280px_1fr]` — left cell is `<EventCover variant="hero">` with convention name + event name + date range overlay; right cell has the countdown, venue line, optional artist-status badge, and one primary CTA "View event" linking to `/events/{id}`.
- Countdown: compute `daysUntil(eventStartDate)` server-side; render "Starts in N days" (or "Today" for 0, "Tomorrow" for 1).
- Do not render "Doors", "Tickets", "Artists" — out of scope.
- Tests: renders countdown for a future date; omits artist badge for public viewer; renders "Accepted" badge for artist with accepted status.

**Verification:** `npm test -- featured-event`.
**Depends on:** 3, 4

---

### 7. Artist rail cards

Wrap three existing/new pieces into the artist rail.

**Requirements:** REQ-22

**Files:**
- `src/components/landing/artist-rail.tsx` — new file; composes the three cards.
- `src/components/landing/rail-cards/quick-status-card.tsx` — new file.
- `src/components/landing/rail-cards/profile-completeness-card.tsx` — new file; thin wrapper that renders `<CompletenessIndicator>` inside a `<Card>` with a heading.
- `src/components/landing/rail-cards/notifications-card.tsx` — new file; wraps `<NotificationList>` with `notifications.slice(0, 3)` and a heading; adds a "See all" link to `/notifications`.
- `__tests__/unit/components/landing/rail-cards/quick-status-card.test.tsx` — new file.

**Approach:**
- `<ArtistRail>` props: `{ counts: QuickStatusCounts; completeness: CompletenessResult; notifications: Notification[] }`.
- `<QuickStatusCard>` renders a 2×2 grid of counts: Applications / Accepted / In review / Following. Use existing Card + typography tokens.
- Completeness card calls the existing `<CompletenessIndicator>` directly.
- Notifications card uses the existing `<NotificationList>` with a sliced array and `unreadCount` recomputed from the slice.
- Tests: `<QuickStatusCard>` renders the four numeric counts and labels.

**Verification:** `npm test -- quick-status-card`.
**Depends on:** 2 (formatRelativeTime), 3 (data shapes)

---

### 8. Public rail cards

Three static / light-logic cards for signed-out and organizer viewers.

**Requirements:** REQ-21

**Files:**
- `src/components/landing/public-rail.tsx` — new file.
- `src/components/landing/rail-cards/brand-cta-card.tsx` — new file.
- `src/components/landing/rail-cards/jump-to-month-card.tsx` — new file.
- `src/components/landing/rail-cards/browse-by-region-card.tsx` — new file.
- `__tests__/unit/components/landing/rail-cards/jump-to-month-card.test.tsx` — new file.

**Approach:**
- `<PublicRail>` props: `{ events: LandingEvent[]; viewer: "public" | "organizer"; activeCountry: string | null }`.
- `<BrandCtaCard>` renders the gradient header block + two buttons. For `viewer === "organizer"` it renders a single "Manage conventions" button to `/conventions/manage`. For `viewer === "public"` it renders "I'm an artist" → `/register/artist` and "I'm an organizer" → `/register/organizer`.
- `<JumpToMonthCard>` groups `events` by `YYYY-MM` of `eventStartDate`; renders a row per month with label ("April 2026") and count. Rows are non-interactive links to `/?month=YYYY-MM` deferred — out of scope; in this iteration just static text.
- `<BrowseByRegionCard>` renders six chips: Norway, Sweden, Denmark, Finland, Iceland, Nordics. Chips are `<Link href="/?country=NO">` etc. The "Nordics" chip links to `/` (clears the filter). Active chip highlighted based on `activeCountry`.
- Tests: jump-to-month groups correctly; "April 2026" label with "1 event" / "3 events" pluralisation.

**Verification:** `npm test -- jump-to-month-card`.
**Depends on:** 3

---

### 9. LandingHeader with filters

Page heading + filter segmented control.

**Requirements:** REQ-9, REQ-10, REQ-11

**Files:**
- `src/components/landing/landing-header.tsx` — new file.
- `src/components/landing/filter-chips.tsx` — new file; renders a row of `<Link>` chips.
- `src/components/landing/country-chips.tsx` — new file; renders country sub-chips (public view only).

**Approach:**
- `<LandingHeader>` props: `{ viewer: "public" | "artist" | "organizer"; firstName: string | null; activeFilter: string; activeCountry: string | null; availableCountries: string[] }`.
- Overline: "Welcome back, {firstName}" for artist; "Events" for others.
- Headline: "What's coming up".
- Subhead copy per REQ-9 / design: artist vs public.
- `<FilterChips>`: render chips with `next/link`, `aria-current="page"` on the active one. Visual treatment of active vs inactive uses existing Card/Badge tokens — keep it close to the design's "segmented thumb" look with a muted background + active pill.
- Artist chips: `all` / `following` / `open` / `applications`.
- Public chips: `all` / `3m` / `country`.
- When public view has `?filter=country` OR `?country=…` set, render `<CountryChips>` below the main filter row with chips for each country in `availableCountries` plus a "All Nordics" clear-chip.

**Verification:** Dev-server visual inspection; filter clicks change URL and rerender.
**Depends on:** none

---

### 10. Page integration

Wire data fetching and the full layout inside `src/app/(public)/page.tsx`; delete the old marketing page.

**Requirements:** REQ-1, REQ-2 (confirms `/events` untouched), REQ-5, REQ-6, REQ-7, REQ-8, REQ-23, REQ-24, REQ-25

**Files:**
- `src/app/(public)/page.tsx` — rewrite. Server component that awaits `auth()`, fetches data, applies filter and country search params, renders `<LandingHeader>`, `<FeaturedEvent>` (conditional), mapped `<EventCard>`s or empty state, and either `<ArtistRail>` or `<PublicRail>`.
- `src/components/homepage/homepage-view.tsx` — delete.
- `src/components/homepage/` — delete directory (it only contained `homepage-view.tsx`).
- `src/components/layout/homepage-footer.tsx` — delete if no other page imports it (check during implementation).

**Approach:**
- `page.tsx` signature: `async function HomePage({ searchParams }: { searchParams: Promise<{ filter?: string; country?: string }> })`.
- Determine `viewer`:
  - `session?.user?.role === "artist"` → `"artist"`.
  - `session?.user?.role === "organizer"` → `"organizer"`.
  - else → `"public"`.
- Fetch: `getUpcomingEvents()` always; if artist, also `getArtistContext(session.user.profileId)` and `getLatestNotifications(session.user.profileId, 3)` and `computeCompleteness(...)` (same inputs as the authenticated dashboard uses).
- Apply filtering using a pure local function `applyFilter(events, viewer, params, artistContext?)`:
  - Artist `following` → events whose `conventionId` is in `artistContext.followedConventionIds`.
  - Artist `open` → `status === "accepting_applications"` AND `applicationCloseDate >= today`.
  - Artist `applications` → events in `artistContext.applicationsByEventId`.
  - Public `3m` → `eventStartDate <= today + 92d`.
  - Country filter → `venueCountry === params.country` (applied regardless of primary filter).
- Layout uses a two-column grid at `xl` and above: `grid-cols-1 xl:grid-cols-[1fr_320px] gap-6`. Page max-width `max-w-[1240px]`, padding `px-6`.
- First event of the filtered list goes into `<FeaturedEvent>`; remainder into the list.
- Handle the empty-state per REQ-15.
- Delete the old `homepage-view.tsx` and any now-orphaned imports. Verify no other route imports `HomepageView`.

**Verification:** `npm run lint`; `npm run build`; manual dev-server test in all three viewer modes (logged out, logged in as artist, logged in as organizer), light and dark theme, narrow and wide viewports. Verify `/events` still renders as before. Verify no imports reference the deleted `homepage-view.tsx`.
**Depends on:** 1-9

---

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 10 |
| REQ-2 | 10 (verification step) |
| REQ-3 | 3, 10 |
| REQ-4 | 3 |
| REQ-5 | 10 |
| REQ-6 | 10 |
| REQ-7 | 10 (PublicShell already provides this) |
| REQ-8 | 10 (PublicShell already provides this) |
| REQ-9 | 9 |
| REQ-10 | 9, 10 |
| REQ-11 | 9, 10 |
| REQ-12 | 6, 10 |
| REQ-13 | 4, 6 |
| REQ-14 | 6 |
| REQ-15 | 6, 10 |
| REQ-16 | 1, 4 |
| REQ-17 | 5 |
| REQ-18 | 5 |
| REQ-19 | 5 |
| REQ-20 | 5 |
| REQ-21 | 8 |
| REQ-22 | 7 |
| REQ-23 | 10 (uses existing tokens) |
| REQ-24 | 4, 5, 10 |
| REQ-25 | 10 |

## Risks

- **`toggleFollow` revalidation path.** The existing action lives under `src/app/(public)/conventions/[conventionId]/actions.ts` and may revalidate its own path only. If it doesn't already call `revalidatePath("/")` or `revalidateTag`, the follow button on the landing page won't refresh state after toggle. Mitigation: during task 5, read the action; if it's missing a revalidation for `/`, add one. If touching a shared action feels too intrusive, the landing page's `<FollowButton>` can call `router.refresh()` inside the `useTransition` as a cheap alternative.
- **Cover-gradient CSS utilities in a v4 Tailwind world.** The codebase uses Tailwind v4 (`@utility` syntax is visible in `globals.css`). Task 1 must use `@utility` blocks consistent with the existing file rather than the old `@layer utilities` form. Verify the produced CSS applies at runtime before trusting it.
- **Logo-aware cover rail layout shifts.** When a convention has no logo, the gradient + initials avatar should look like it belongs to the same system as a logo-backed rail. Pay attention to contrast and text legibility in dark mode during manual testing (task 10).
- **Country chip list source.** Task 8 uses `availableCountries = unique venueCountry` from the current events. If the DB hasn't been seeded with diverse countries, the region chip UI will look thin. Acceptable — the hard-coded six-region chips from the design already handle the visual richness; the DB-derived list is only for filter matching.
