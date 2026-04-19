# Implementation Plan: Organizer Selection Redesign

Spec: `.claude/plans/organizer-selection-redesign-spec.md`

## Technical Decisions

- **Pin storage**: `pinned boolean NOT NULL DEFAULT false` on `applications`. Orthogonal to status — filter "Pinned" = `pinned = true`.
- **Genres / Mediums registry**: Fixed registries in `src/lib/artist-profile/tags.ts` using the design's exact arrays. Zod enforces values must come from the registry. New `text[]` columns on `artist_profiles` with `default []`.
- **Snapshot**: Extend `ProfileSnapshot` with `genres: string[]` and `mediums: string[]`. Captured during `applyToEvent`.
- **Multi-select chip primitive**: New `components/ui/chip-select.tsx` — click to toggle; emits hidden `<input>` per selected value so the server reads via `formData.getAll(name)`. Keeps the existing uncontrolled `<form action={...}>` + `useActionState` pattern.
- **Server actions**: Two new actions in the existing `applications/actions.ts` — `toggleApplicationPin` and `setBulkDecision`. Both require event status `reviewing` and organizer ownership.
- **Query layer**: New `getEventApplicants(conventionId, eventId)` in `src/lib/conventions/queries.ts` returning the shape Selection needs. Keeps `page.tsx` thin.
- **Selection UI composition**: New directory `src/components/conventions/selection/` with a `SelectionWorkspace` client container owning state + presentational children: `selection-sidebar`, `selection-progress`, `bulk-bar`, `gallery-layout`, `table-layout`, `deep-review-layout`.
- **Segmented control primitive**: New `components/ui/segmented.tsx` used for the three-layout toggle (no existing equivalent).
- **Design tokens**: Add `--success`, `--warning` (plus `-container` / `-on-container` variants, both light and dark) to `globals.css`. Add a `warning` variant to `Badge`; retire the `secondary`-as-warning hack inside Selection UI.
- **Detail page removal**: Delete `[applicationId]/page.tsx`. Replace `ApplicantList` usage at the call site (Selection page) with `SelectionWorkspace`. Remove `revalidatePath` targeting the dead route.
- **Post-publish behaviour**: Selection remains the only detail surface after `results_published`. Deep review exposes `confirmPayment` + `revokeApplication` on accepted applicants; pin / accept / reject / bulk are disabled.
- **Tests**: Vitest — unit (validations, small helpers), integration (new server actions hitting the test DB), jsdom component tests for the workspace's state machine. No Playwright (not set up).

## Tasks

### 1. Add schema columns and migration ✅

Adds the new storage: `applications.pinned`, `artist_profiles.genres`, `artist_profiles.mediums`.

**Status**: Completed (commit `d0ba6686`). Migration `0007_puzzling_blockbuster.sql` applied to both dev and test DBs.

**Requirements:** REQ-3, REQ-10

**Files:**
- `src/lib/db/schema/applications.ts` — add `pinned: boolean("pinned").notNull().default(false)`.
- `src/lib/db/schema/artist-profiles.ts` — add `genres: text("genres").array().notNull().default([])` and `mediums: text("mediums").array().notNull().default([])`.
- `src/lib/db/migrations/` — new migration file produced by `drizzle-kit generate`.

**Approach:**
- Edit both schema files.
- Run `npx drizzle-kit generate` to produce a migration file. Review the generated SQL — expect `ALTER TABLE ... ADD COLUMN` with defaults.
- Run `npx drizzle-kit migrate` against the local DB.
- Do not touch any other schema; keep the migration focused.

**Verification:** `npm run build` passes; inspect generated migration SQL; start dev DB and confirm `\d+ applications` / `\d+ artist_profiles` show new columns.

**Depends on:** none.

### 2. Extend `ProfileSnapshot` and application submission ✅

Widens the snapshot type and writes genres/mediums into it when an artist applies.

**Status**: Completed. Snapshot type extended; `applyToEvent` captures both arrays; integration test covers empty and populated cases.

**Requirements:** REQ-10, Infrastructure (for REQ-7, REQ-8, REQ-9)

**Files:**
- `src/lib/db/schema/applications.ts` — extend `ProfileSnapshot` interface with `genres: string[]` and `mediums: string[]`.
- `src/app/(public)/events/[eventId]/actions.ts` — in `applyToEvent`, include `genres: artistProfile.genres ?? []` and `mediums: artistProfile.mediums ?? []` when building the snapshot literal.
- `__tests__/integration/apply-to-event.test.ts` — add assertions that submitted snapshot contains the expected genres/mediums values when they are set on the artist profile.

**Approach:**
- Update the interface.
- Update the snapshot literal in `applyToEvent`.
- Extend the existing integration test: set genres/mediums in the test artist factory data and assert they land in the stored `profileSnapshot`.

**Verification:** `npm test -- apply-to-event` passes.

**Depends on:** task 1.

### 3. Genre + medium registries and Zod schemas ✅

Introduces the fixed tag registries and validation.

**Status**: Completed. Registries live at `src/lib/artist-profile/tags.ts`; `basicInfoSchema` validates both arrays.

**Requirements:** REQ-10

**Files:**
- `src/lib/artist-profile/tags.ts` (new) — export `GENRES` and `MEDIUMS` as `readonly string[]` with the verbatim design values, plus `isGenre(value): value is typeof GENRES[number]` and `isMedium(...)` helpers.
- `src/lib/validations/profile.ts` — add `genresSchema = z.array(z.enum(GENRES)).max(20).default([])` and `mediumsSchema` similarly; extend the appropriate schema (basic-info or logistics — pick basic-info since it's identity-adjacent).
- `__tests__/unit/lib/validations-profile.test.ts` — add cases: empty arrays pass, values in registry pass, a value outside registry fails, duplicates dedupe if that's the chosen behaviour.
- `__tests__/helpers/db.ts` — extend `createTestArtist` to accept optional `genres` / `mediums` overrides.

**Approach:**
- Use the arrays from the design transcript verbatim:
  - `GENRES = ["Comics","Illustration","Zines","Horror","Folk","Queer","Slice of life","Sci-fi","Fantasy","Nature"]`
  - `MEDIUMS = ["Ink","Risograph","Digital","Watercolor","Gouache","Screenprint","Pastel","Acrylic"]`
- Decide dedupe behaviour: reject duplicates via `.refine` (simpler) or dedupe via `.transform(Array.from.new Set)`. Recommend **reject** for clarity — the UI won't send dupes.

**Verification:** `npm test -- validations-profile` passes.

**Depends on:** task 1.

### 4. `ChipSelect` UI primitive ✅

A multi-select chip component that toggles values from a fixed registry and emits hidden inputs for FormData submission.

**Status**: Completed at `src/components/ui/chip-select.tsx`; jsdom tests cover defaultValues, toggling, max constraint, option-filtering.

**Requirements:** Infrastructure (for REQ-10)

**Files:**
- `src/components/ui/chip-select.tsx` (new) — client component.
- `__tests__/components/chip-select.test.tsx` (new) — component test.

**Approach:**
- Props: `name: string`, `options: readonly string[]`, `defaultValues?: string[]`, `max?: number`, `className?: string`.
- Internal state: `const [selected, setSelected] = useState<string[]>(defaultValues ?? [])`.
- Render: flex-wrap list of pill buttons. Selected chips use `bg-primary text-primary-foreground`, unselected use `border border-border text-muted-foreground`. Click toggles.
- Emit: one `<input type="hidden" name={name} value={v} />` per selected — server reads via `formData.getAll(name)`.
- Accessibility: each chip is a `<button type="button" aria-pressed={isSelected}>`.
- Tests: initial render reflects `defaultValues`; clicking adds/removes; hidden inputs match selected.

**Verification:** `npm test -- chip-select` passes.

**Depends on:** none.

### 5. Artist profile editor — add genres + mediums sections ✅

Lets artists set their genres and mediums from the editor.

**Status**: Completed. Two new sections in the basic-info form wired via `ChipSelect`; `updateBasicInfo` persists both arrays.

**Requirements:** REQ-10

**Files:**
- `src/app/(authenticated)/dashboard/profile/page.tsx` — pass `genres` / `mediums` through `defaultValues`.
- `src/components/profile/basic-info-form.tsx` — add two sections (Genres, Mediums) using `ChipSelect`.
- `src/app/(authenticated)/dashboard/profile/actions.ts` — extend `updateBasicInfo` to read `formData.getAll("genres")` and `formData.getAll("mediums")`, validate via the extended Zod schema, write to DB.
- `__tests__/integration/convention-profile.test.ts` (or the profile-specific test file) — add a test covering genre/medium persistence.

**Approach:**
- Add two sibling `<section>` blocks inside the basic-info form, each with a heading and a `<ChipSelect name="genres" options={GENRES} defaultValues={defaultValues.genres} />`.
- In the server action, parse arrays. Empty arrays are valid.
- Follow existing editorial layout styling conventions observed in the recent redesign commits.

**Verification:** Manually open the profile editor (later, during the manual-testing step), `npm test` for the profile test file.

**Depends on:** tasks 3, 4.

### 6. Design tokens + `warning` Badge variant ✅

Introduces semantic `--success` / `--warning` tokens aligned with the design, and a proper Badge variant.

**Status**: Completed. `--success*` and `--warning*` tokens added (light+dark); Badge `success` reroutes to the new container tokens and new `warning` variant added.

**Requirements:** Infrastructure (for REQ-5, REQ-7, REQ-9)

**Files:**
- `src/app/globals.css` — add `--success`, `--success-container`, `--on-success-container`, `--warning`, `--warning-container`, `--on-warning-container` for both light and dark themes. Values sourced from design `shared.css`.
- `src/components/ui/badge.tsx` — add a `warning` variant using the new tokens. Keep existing variants.
- `tailwind.config.*` (if present) — expose the tokens as `bg-success`, `bg-warning`, etc. Most shadcn setups already read from CSS vars; verify before adding config noise.
- `__tests__/components/badge.test.tsx` — add assertion for the `warning` variant render.

**Approach:**
- Re-use design values verbatim (`--success:#0a8f5a` etc.; dark mode per design file).
- Keep the existing `secondary` variant — just stop relying on it as a warning stand-in within Selection UI.

**Verification:** `npm test -- badge` passes; visual check happens later in manual testing.

**Depends on:** none.

### 7. `Segmented` UI primitive ✅

Three-way layout toggle (`aria-selected`, keyboard-navigable).

**Status**: Completed at `src/components/ui/segmented.tsx`; tab role + aria-selected.

**Requirements:** Infrastructure (for REQ-2)

**Files:**
- `src/components/ui/segmented.tsx` (new).
- `__tests__/components/segmented.test.tsx` (new).

**Approach:**
- Props: `value: string`, `onChange: (v: string) => void`, `options: { value: string; label: string; icon?: ReactNode }[]`, `size?: "sm" | "md"`, `className?: string`.
- Render a `<div role="tablist">` of `<button role="tab" aria-selected={value === v.value}>` buttons. Apply the design's `.segmented` styles via Tailwind: `bg-muted rounded-lg p-0.5 inline-flex gap-0` and per-button `px-3.5 py-1.5 text-xs font-semibold rounded-md text-muted-foreground aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-sm`.
- Tests: correct aria-selected; clicking fires onChange with the right value.

**Verification:** `npm test -- segmented` passes.

**Depends on:** none.

### 8. Server action: `toggleApplicationPin` ✅

Persists pin state for a single application.

**Status**: Completed. Action guarded to organizer + reviewing status; integration tests cover pin, unpin, wrong-status, wrong-role.

**Requirements:** REQ-3

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions.ts` — add `toggleApplicationPin(prev, formData)`.
- `__tests__/integration/application-review.test.ts` — add cases for toggle pin (happy path, organizer-ownership guard, event-status guard: only `reviewing`).

**Approach:**
- FormData: `applicationId`, `eventId`, `pinned` ("true" | "false").
- Guards: session has `role === "organizer"`, event belongs to organizer's convention, event status is `reviewing`.
- Update: `db.update(applications).set({ pinned: parsedBool }).where(and(eq(id, ...), eq(eventId, ...)))`.
- `revalidatePath('/conventions/manage/events/[eventId]/applications')` on the Selection route.
- Return `ActionState` shape consistent with existing actions.

**Verification:** `npm test -- application-review` passes.

**Depends on:** task 1.

### 9. Server action: `setBulkDecision` ✅

Persists bulk accept/reject for multiple applications atomically.

**Status**: Completed. Applies to all selected ids in a single UPDATE; validates they all belong to the event; integration tests cover happy path, mixed-event rejection, empty-selection rejection, wrong-status rejection.

**Requirements:** REQ-6

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions.ts` — add `setBulkDecision(prev, formData)`.
- `__tests__/integration/application-review.test.ts` — add cases: valid bulk accept, valid bulk reject, mixed event IDs rejected, event-status guard, organizer-ownership guard, at least one applicationId required.

**Approach:**
- FormData: `eventId`, `decision` ("accepted" | "rejected"), multiple `applicationIds`.
- Read `formData.getAll("applicationIds").filter(Boolean)` and coerce to strings.
- Guards same as `toggleApplicationPin`.
- Verify every target application belongs to the given event (single DB read, then count). Reject the whole batch on mismatch.
- Update in a single SQL statement: `db.update(applications).set({ status: decision }).where(and(eq(eventId, ...), inArray(id, ids)))`.
- Revalidate Selection path.

**Verification:** `npm test -- application-review` passes.

**Depends on:** task 1.

### 10. Query helper for Selection page

Returns applicants ready for display, with the fields the new UI needs.

**Requirements:** Infrastructure (for REQ-4, REQ-5, REQ-7, REQ-8, REQ-9)

**Files:**
- `src/lib/conventions/queries.ts` — add `getEventApplicants(conventionId: string, eventId: string)`.
- `__tests__/integration/application-review.test.ts` — add a test for the helper (returns expected shape; ownership filter).

**Approach:**
- Return type: array of `{ id, profileId, status, pinned, paymentConfirmed, createdAt, snapshot: ProfileSnapshot, isBlockListed }`.
- Query joins `events` to enforce `events.conventionId === conventionId`.
- Order by `createdAt asc`.
- Keep it a thin wrapper; no business logic.

**Verification:** Test passes; no types errors.

**Depends on:** tasks 1, 2.

### 11. `SelectionProgress` + `SelectionSidebar` components

Progress bar and filter rail.

**Requirements:** REQ-4, REQ-5

**Files:**
- `src/components/conventions/selection/selection-progress.tsx` (new) — server-safe (pure props), no client state needed.
- `src/components/conventions/selection/selection-sidebar.tsx` (new) — client (owns filter via props).
- `__tests__/components/selection-progress.test.tsx` (new) — verifies counts + "target X" text + null-target behaviour.
- `__tests__/components/selection-sidebar.test.tsx` (new) — verifies counts per filter row + active-state styling.

**Approach:**
- `SelectionProgress` props: `{ accepted: number; pinned: number; target: number | null }`. Summary text: "N accepted · M pinned · K open" where K = `target == null ? null : max(0, target - accepted)`. If `target == null`, show summary text only (no bar).
- `SelectionSidebar` props: `{ counts: Record<Filter, number>; active: Filter; onChange: (f: Filter) => void; genresSummary: string[]; bulkMode: boolean; onToggleBulkMode: () => void; disabled?: boolean }`.
- Filter keys: `"all" | "undecided" | "pinned" | "accepted" | "rejected"`.
- Style: card shell with `shadow-gallery`. Row buttons use the editorial hover pattern; active row uses `bg-muted text-foreground`.
- Decorative genre section renders a flex-wrap of `Badge variant="outline"` from `genresSummary`.

**Verification:** Component tests pass.

**Depends on:** task 6 (for variants/tokens).

### 12. `GalleryLayout`

Card grid over filtered applicants.

**Requirements:** REQ-7

**Files:**
- `src/components/conventions/selection/gallery-layout.tsx` (new).
- `__tests__/components/gallery-layout.test.tsx` (new).

**Approach:**
- Props: `{ applicants: SelectionApplicant[]; bulkMode: boolean; selected: Set<string>; onToggleSelect: (id: string) => void; onTogglePin: (id: string) => void; onSetStatus: (id: string, status: "accepted" | "rejected") => void; readOnly: boolean }`.
- Card shape per applicant: top collage (`grid-cols-3 grid-rows-2` of up to 6 images, first image spans 2×2); status Badge + pin button overlaid on collage; bottom block with name, location-less subtitle (just `truncate` the displayName if no subtitle), genre/medium chips; Accept / Not-this-year buttons along the bottom.
- When `bulkMode`, show a checkbox overlay on the top-left; checked state uses `bg-primary border-primary`.
- When `readOnly`, hide pin button + action buttons; keep status badge.
- Empty state: centered Card with friendly "No applicants in this filter" copy (per design's `shown.length===0` branch).
- Use existing `Card`, `Button`, `Badge`, `Checkbox`, `Avatar`, `shadow-gallery` class.
- Portfolio image URLs: resolve from snapshot images using existing R2 URL helper (same helper used in the current detail page).

**Verification:** Component test — renders expected number of cards; Accept click fires onSetStatus; bulkMode toggles checkbox visibility; `readOnly` hides actions.

**Depends on:** tasks 6, 10, 11.

### 13. `TableLayout`

Dense row-per-applicant view.

**Requirements:** REQ-8

**Files:**
- `src/components/conventions/selection/table-layout.tsx` (new).
- `__tests__/components/table-layout.test.tsx` (new).

**Approach:**
- Props mirror `GalleryLayout` plus `onRowClick: (id: string) => void` to jump to Deep review on that applicant.
- Grid layout with column header: avatar, name, genres/mediums, submitted date, table preference, status badge, pin button. When `bulkMode`, add a checkbox column.
- Use semantic HTML (`<table>` or div grid) — a grid matches the design exactly and is easier to style. Use `role="grid"` and `role="row"`.
- Row click (outside checkbox / pin) → `onRowClick(id)`; stop propagation on interactive children.
- Empty state mirrors Gallery.

**Verification:** Component test — row click fires `onRowClick`; checkbox click does not fire `onRowClick`; pin click does not fire `onRowClick`.

**Depends on:** tasks 6, 10, 11.

### 14. `DeepReviewLayout`

Single-applicant deep-dive with prev/next and decision actions.

**Requirements:** REQ-9, Post-publish confirmPayment/revoke

**Files:**
- `src/components/conventions/selection/deep-review-layout.tsx` (new).
- `__tests__/components/deep-review-layout.test.tsx` (new).

**Approach:**
- Props: `{ applicants: SelectionApplicant[]; index: number; onIndexChange: (i: number) => void; onTogglePin; onSetStatus; onConfirmPayment; onRevoke; readOnly: boolean; eventStatus: "reviewing" | "results_published" }`.
- Layout: two columns on lg — left collage (reuse the 6-image grid pattern), right panel with Overline / name / genres+mediums / statement / table·helpers·accessibility grid / prev|reject|accept|pin|next footer.
- When `eventStatus === "results_published"`:
  - Hide pin, accept, reject.
  - Show `Mark paid` / `Revoke` buttons if applicant status is `accepted`. These reuse existing confirmPayment / revoke server actions — wire via a `useTransition` + `FormData` call that resolves via the actions layer already exposed in `applications/actions.ts`.
- Empty state: "Nothing matches this filter."
- Prev clamps to 0, Next clamps to length-1.

**Verification:** Component test verifies prev/next clamp; button hides based on `eventStatus`; accept/reject disabled when `readOnly`.

**Depends on:** tasks 6, 10, 11.

### 15. `BulkBar`

Sticky floating action bar for bulk operations.

**Requirements:** REQ-6

**Files:**
- `src/components/conventions/selection/bulk-bar.tsx` (new).
- `__tests__/components/bulk-bar.test.tsx` (new).

**Approach:**
- Props: `{ count: number; onAccept: () => void; onReject: () => void; onClear: () => void; disabled?: boolean }`.
- Render null when `count === 0`.
- Sticky card: "X selected · Accept all · Reject all · clear".

**Verification:** Component test.

**Depends on:** none.

### 16. `SelectionWorkspace` container

Wires state, filtering, mutations, and layouts together.

**Requirements:** REQ-2, REQ-3, REQ-4, REQ-6, REQ-9, REQ-14

**Files:**
- `src/components/conventions/selection/selection-workspace.tsx` (new) — client component.
- `__tests__/components/selection-workspace.test.tsx` (new).

**Approach:**
- Props: `{ eventId: string; eventName: string; availableStands: number | null; eventStatus: string; initialApplicants: SelectionApplicant[]; genresSummary: string[] }`.
- State (`useState`): `applicants` (seeded from prop), `filter`, `layout` (default `"gallery"`), `deepIndex`, `bulkMode`, `selectedIds: Set<string>`.
- `readOnly = eventStatus === "results_published"`.
- Derived: `filteredApplicants`, `counts` per filter.
- Optimistic updates: `useOptimistic` (React 19) or `useTransition` around server actions. On pin / status change, update local state immediately, then fire the action. On failure, revert (simple `catch` → revert to previous state + toast/error message using existing toast helper or `console.error` fallback; follow whatever pattern exists in other mutating components).
- Bulk handlers: collect selected IDs → call `setBulkDecision` → clear selection.
- Open Deep review from Table row: `onRowClick(id)` sets `layout="stacked"` and `deepIndex = filtered.findIndex(a => a.id === id)`.
- Reset `deepIndex` when `filter` changes.
- Read-only mode disables pin/accept/reject/bulk but keeps layout/filter navigation + post-publish revoke/confirmPayment in Deep review.

**Verification:** Component test: renders default Gallery, filter change updates counts, bulk mode toggles checkboxes, bulk accept calls the action with selected IDs, Table row click swaps to Deep review with correct index. Uses existing jsdom component setup.

**Depends on:** tasks 7, 8, 9, 10, 11, 12, 13, 14, 15.

### 17. Page header and layout toggle placement

Updates the Selection page to host the workspace, page header, and Finalize button.

**Requirements:** REQ-1, REQ-2, REQ-11, REQ-14

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/page.tsx` — major rewrite.

**Approach:**
- Keep server component. Fetch: event, convention, applicants via `getEventApplicants`, distinct genres from applicant snapshots for the sidebar summary (compute in memory — no separate query).
- Render: editorial page frame (`max-w-[1400px] px-6 py-10`); header with Overline "Selection · {event.name}", H1 "Pick your artists", subhead "{undecided} still undecided"; segmented control mounted by `SelectionWorkspace` (layout toggle is owned by the workspace since it flips layout state).
- Mount `SelectionProgress` (accepted / pinned / target) above workspace.
- Keep `PublishResultsButton` — rename/repurpose visually as the "Finalize selection" trigger without changing the underlying action.
- Keep `ResponseTemplatesForm` section as-is (out of scope).
- Remove the old `<ApplicantList>` section; replace with `<SelectionWorkspace />`.

**Verification:** `npm run build` passes; manually verify hooks via `npm run dev` later during manual-testing. Unit tests aren't practical for server components here.

**Depends on:** task 16.

### 18. Remove `/applications/[applicationId]` page and clean up

Removes the dead route and every reference to it.

**Requirements:** REQ-12

**Files:**
- Delete `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/[applicationId]/page.tsx`.
- Delete `src/components/conventions/applicant-list.tsx` (replaced by `SelectionWorkspace`).
- Delete `src/components/conventions/application-decision-controls.tsx` if unused after removal.
- `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions.ts` — remove `revalidatePath` calls targeting the deleted route; no other action logic changes.
- Grep for any other references to the deleted files/path and remove.

**Approach:**
- After deleting each file, `npm run build` to catch lingering imports.
- Keep the server actions file; it's still referenced by new UI.

**Verification:** `npm run build` passes with no unresolved imports; no dead paths referenced in `grep -r "applications/\\[applicationId\\]" src/`.

**Depends on:** task 17.

### 19. Integration tests: decision flow end-to-end

Locks down the new actions + existing review flow in the new UI's terms.

**Requirements:** REQ-3, REQ-6 (already partially covered by tasks 8/9 tests), REQ-14

**Files:**
- `__tests__/integration/application-review.test.ts` — extend with scenarios: pin persists; pin rejected on non-reviewing event; bulk decision rejects mixed-event IDs; bulk decision applies to all IDs atomically; `toggleApplicationPin` cannot run post-publish.

**Approach:**
- Reuse existing factories from `__tests__/helpers/db.ts`.
- Each test uses `cleanDatabase()` in `beforeEach`.
- Ensure tests are independent — no ordering assumption.

**Verification:** `npm test -- application-review` passes.

**Depends on:** tasks 8, 9.

### 20. Full test sweep

Run all checks before considering the feature done.

**Requirements:** Infrastructure (gate before review).

**Files:** none modified.

**Approach:**
- `npm run lint`
- `npm run build`
- `npm test`
- Visual smoke: start dev server, click through as organizer to verify none of the page-level crashes.

**Verification:** All green; manual click-through reveals no console errors.

**Depends on:** tasks 1–19.

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 17 |
| REQ-2 | 7, 16, 17 |
| REQ-3 | 1, 8, 16, 19 |
| REQ-4 | 11, 16 |
| REQ-5 | 11, 17 |
| REQ-6 | 9, 15, 16, 19 |
| REQ-7 | 12 |
| REQ-8 | 13 |
| REQ-9 | 14 |
| REQ-10 | 1, 2, 3, 4, 5 |
| REQ-11 | 17 |
| REQ-12 | 18 |
| REQ-13 | 11 |
| REQ-14 | 14, 16, 19 |

## Risks

- **Drizzle array defaults**: `text().array().notNull().default([])` behaviour for backfilling existing rows needs verification. Expected: existing rows get empty arrays. Inspect generated SQL before migrating.
- **Snapshot back-compat**: Existing applications already have `profileSnapshot` JSONB without `genres` / `mediums`. Deep review and Gallery must handle `undefined` gracefully (treat as `[]`). Account for this in the mapper inside `getEventApplicants`.
- **Optimistic update revert**: If the server action fails (e.g., event status changed mid-session), the workspace must surface the error. Decide on the toast/inline pattern during task 16. If no existing toast helper, fall back to a small inline banner.
- **Segmented control keyboard nav**: Getting `aria-selected` + arrow-key nav right needs attention — test against keyboard use during task 7.
- **Design tokens dark mode**: New `--success` / `--warning` tokens must be supplied for both light and dark to avoid regressions in the existing Badge usage.
- **Post-publish UX edge**: Deep review post-publish still needs to surface `paymentConfirmed` status and revoke dialog copy. Pattern-match against the old detail page so users don't lose functionality.
- **No Playwright**: We can't verify full-journey regressions automatically. Manual testing in step 5 of the workflow becomes more important; consider adding Playwright in a follow-up.
