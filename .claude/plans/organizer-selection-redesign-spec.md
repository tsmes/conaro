# Organizer Selection Redesign

## Problem Statement

The current "Review applications" page is a plain list — it doesn't reflect the curatorial nature of selecting artists for a convention. Organizers can't browse portfolios visually, can't collect favourites as they skim, can't efficiently bulk-handle obvious accepts/rejects, and have no sense of progress toward filling the available stands. The redesign turns Review → Selection: a visual-first workflow with three layouts, pinning, bulk actions, and a stand-fill progress indicator.

## Requirements

- REQ-1: Page title changes from "Review applications" to "Selection · [Event name]".
- REQ-2: Three layouts toggled from a page-level segmented control: **Gallery grid**, **Table**, **Deep review**. Default is Gallery. Toggle state is session-only (no persistence).
- REQ-3: **Pin** any applicant from any layout. Pinning is independent of decision (submitted/accepted/rejected). Unpinning is always available.
- REQ-4: Filter sidebar with five rows, each showing a count: All applicants / Undecided / Pinned / Accepted / Not this year. Only one active at a time.
- REQ-5: **Selection progress bar** showing `accepted` count and `pinned` count as segments against the event's `availableStands` target. Summary text: "N accepted · M pinned · K open".
- REQ-6: **Bulk mode** toggle. When active, checkboxes appear on cards/rows; a sticky bulk-action bar shows "X selected" with bulk Accept / bulk Reject / clear.
- REQ-7: **Gallery cards** show: portfolio image collage (up to 6), display name, decision badge, pin button, genres + mediums badges, one-click "Accept" / "Not this year" buttons.
- REQ-8: **Table rows** show: avatar, name, genres + mediums, submitted date, table-size preference, pin button. Clicking a row switches to Deep review focused on that applicant.
- REQ-9: **Deep review layout** shows one applicant with: portfolio collage, display name, genres + mediums, artist statement (bio), table / helpers / accessibility details, prev/next nav, accept / reject / pin actions. An "X of Y" indicator reflects position within the active filter.
- REQ-10: Artist profile gets new `genres: text[]` and `mediums: text[]` columns. The artist profile editor lets artists add/remove values from a fixed registry. Application snapshot captures both.
- REQ-11: A single "**Finalize selection**" button maps to the existing `publishResults` action. No separate "Send decisions" button.
- REQ-12: The standalone `/applications/[applicationId]` detail page is removed; any internal links that previously pointed there now point at the new Selection page.
- REQ-13: Genre chips in the sidebar are decorative only (display-only summary of genres seen in the applicant pool) — not a functional filter in this iteration.
- REQ-14: When the event status is `results_published`, Selection renders in a read-only view: no pinning, no accept/reject, no bulk mode, but layouts and filters still work for viewing.

## Scope

### In Scope

- Redesigned Selection page at `/conventions/manage/events/[eventId]/applications`.
- Three layouts: Gallery, Table, Deep review, with a page-level layout toggle.
- Filter sidebar with five filters and counts.
- Selection progress bar wired to `events.availableStands`.
- Pin / unpin applicants — new `pinned` column on `applications`.
- Bulk mode with multi-select and a bulk accept / bulk reject server action.
- New `genres` and `mediums` `text[]` columns on `artist_profiles`, captured in `ProfileSnapshot`, shown on applicant cards and Deep review.
- Artist profile editor UI update: add genres + mediums inputs from a fixed registry.
- Removal of the standalone `/applications/[applicationId]` detail page.
- Single "Finalize selection" button → existing `publishResults` action.
- Read-only Selection behaviour when event status is `results_published`.

### Out of Scope

- Jury discussion notes / per-applicant comment threads.
- `location`, `handle`, "past-shows" counter, power/wall-display fields on profile or cards.
- A separate "Send decisions" action distinct from publish.
- Genre sidebar as a functional filter.
- Deep-link URLs for a specific applicant (`?applicant=id` or similar).
- Keyboard shortcuts for prev/next/accept/reject in Deep review.
- Response-templates form redesign (keeps its existing layout on the page).
- Multi-organizer concepts.
- Artist avatar gradient colour assignment (avatars use initials only).
- Floor-plan / stand assignment.

## Acceptance Criteria

These are verified during manual testing (step 5 of the workflow). Each must be checked off before the feature is considered complete.

- [ ] On `/conventions/manage/events/[eventId]/applications`, the page title reads "Selection · [Event name]" with the total undecided count in the subheader.
- [ ] Layout toggle shows three options (Gallery / Table / Deep review); selecting one updates the viewport; Gallery is shown by default on page load.
- [ ] Gallery view renders a card per applicant with portfolio collage, name, genres + mediums chips, decision badge, pin button, and one-click Accept / Not-this-year buttons.
- [ ] Table view renders one row per applicant with avatar, name, genres + mediums, submitted date, table preference, status badge, and pin button. Clicking a row switches the layout to Deep review focused on that applicant.
- [ ] Deep review shows portfolio collage, name, genres + mediums, statement (bio), table/helpers/accessibility details, a position indicator ("X/Y"), and prev / reject / accept / pin / next controls. Prev/Next cycles through the active filter's results.
- [ ] Filter sidebar shows five rows (All / Undecided / Pinned / Accepted / Not this year), each with its count. Selecting a filter narrows all three layouts.
- [ ] Pinning an applicant immediately updates the UI, persists to the database, shows the pin indicator across all layouts, and increments the "Pinned" filter count. Pinning is independent of the applicant's decision.
- [ ] Progress bar shows "N accepted · M pinned · K open" where K = `availableStands − accepted`. Accepted and pinned appear as two coloured segments over `availableStands`.
- [ ] Enabling bulk mode adds checkboxes. With 1+ selected, the sticky bulk bar appears with bulk Accept / bulk Reject / clear. Bulk actions update all selected applicants in one server round-trip and clear the selection.
- [ ] An artist can set genres and mediums on their profile; both are captured into the application snapshot when an application is submitted; both are visible in the Selection page Gallery, Table, and Deep review views.
- [ ] Applying database migrations creates `applications.pinned` (boolean, default false) and `artist_profiles.genres` / `artist_profiles.mediums` (text arrays, default empty).
- [ ] The route `/conventions/manage/events/[eventId]/applications/[applicationId]` no longer exists and any internal link that previously pointed there now goes to the Selection page.
- [ ] The "Finalize selection" button on the Selection page calls the existing `publishResults` action; it is disabled when undecided > 0, exactly as today.
- [ ] When event status is `results_published`, Selection renders in a read-only mode: no pinning, no accept/reject, no bulk mode; layouts and filters still work for viewing.

## Constraints

- Must use existing tech stack: Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, Drizzle, PostgreSQL.
- `availableStands` is nullable on `events` today; when null, progress bar treats it as "no target set" (shows counts but no bar).
- Must adhere to project standards (`STANDARDS.md`): kebab-case filenames, camelCase identifiers, server components by default, business logic in `lib/` (not in components), Zod validation at API boundaries, Vitest unit/integration tests, Playwright E2E for critical journeys.
- The design in `/tmp/design-extract/conaro/project/organizer/Organizer Selection.html` is the visual reference. The implementation recreates the look; it does not need to mirror the prototype's internal component structure.
- Single-organizer model: one organizer per convention (no multi-user discussion / attribution needed).
