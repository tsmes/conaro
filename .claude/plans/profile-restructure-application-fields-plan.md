# Implementation Plan: Artist Profile Restructure & Application Form Fields

Spec: `.claude/plans/profile-restructure-application-fields-spec.md`

## Technical Decisions

- **Unified field registry with a `source` discriminator.** Extend the existing `FieldDefinition` type with `source: "profile" | "application"` and add the six new application-source fields to the same `FIELD_REGISTRY` array. Reason: the existing organizer fields editor already iterates the registry grouped by section — adding a new section key `"application"` is the smallest change and keeps all per-event toggling in one screen. Alternative (separate registry) would duplicate plumbing and complicate the editor.

- **Application-level answers stored as a single typed JSONB column.** Add `answers` (typed `ApplicationAnswers` JSONB) and `guidelinesAcknowledgedAt` (timestamp) to `applications`. Reason: mirrors the existing `profileSnapshot` JSONB pattern, avoids a migration every time a new field is added, and gives us one shape to version later. Top-level scalar for the acknowledgment timestamp is kept out of JSONB so it's queryable and auditable.

- **Portfolio section as a pgEnum column on `portfolio_images`**, not separate tables. Values `promo | product | previous_stand`, default `product`. Backfill existing images to `product`. Reason: cheapest migration, preserves the existing `sortOrder` ordering, and matches the UX (a single gallery filtered by tag per section). Caption column is nullable text, only surfaced in the Previous Stands UI.

- **Table size options stored as JSONB on the event.** Shape `TableSizeOption[]` where each option is `{ id: string, label: string, dimensions: string, priceNok: number | null }`. `id` is a short `crypto.randomUUID()` generated when the organizer adds a row; it is what the application references when the artist picks one. Reason: avoids a second table purely for 0–3 options per event; keeps the editor a single form; the `id` stays stable across edits so application references remain valid.

- **Guidelines resolved at read time.** The event edit form stores `guidelinesOverride` (nullable); the application form resolves `event.guidelinesOverride ?? convention.guidelines ?? null` and renders whatever is non-null. No denormalised copy. Reason: simplest path to the REQ-6 "override" behaviour; keeps edits in one place.

- **ProfileSnapshot stays structurally the same** minus `tableSizePreference`. New application-level answers live in the new `answers` column. Historical snapshots retain the removed field in JSONB (we simply stop writing it). Reason: matches spec's "Out of Scope" clause on snapshot serialization.

- **Validation in `src/lib/validations/application.ts`.** One new Zod schema `applicationAnswersSchema` parameterised by the event's field requirements + table size option ids + max assistants. Reason: matches the existing validations-per-domain file pattern (`validations-auth.ts`, `validations-convention.ts`, etc.).

- **Field-config UI adds a fourth section block** ("Application form") below the three profile-source sections. The `updateFieldConfig` action merges all four sections into the same `events.fieldRequirements` JSONB. Reason: organizers see one screen; existing merge logic already keyed by field id.

## Tasks

### 1. Schema — portfolio sections & caption

Add `section` enum and optional `caption` to portfolio_images; generate and apply migration; backfill existing rows.

**Requirements:** REQ-2, REQ-3, REQ-4

**Files:**
- `src/lib/db/schema/portfolio-images.ts` — add `portfolioSectionEnum` (`promo | product | previous_stand`) and two new columns: `section` (enum, notNull, default `"product"`) and `caption` (text, nullable).
- `src/lib/db/schema/index.ts` — export the new enum if the re-export barrel is used there.
- `src/lib/db/migrations/NNNN_*.sql` — generated via `npm run db:generate`.
- `__tests__/integration/portfolio.test.ts` — if it exists, extend to cover section default + caption round-trip; otherwise add a minimal integration test.

**Approach:**
- Add enum + columns in schema file.
- Run `npm run db:generate` to produce the migration. Verify the generated SQL includes `DEFAULT 'product'` on the new column so backfill is implicit.
- Apply locally via `npm run db:migrate` (localhost-only per safety rules).
- Re-run `npm test` to confirm no regressions.

**Verification:** Migration applies cleanly; existing images selectable with `section = 'product'`; `npm test` passes.
**Depends on:** none

---

### 2. Schema — remove tableSizePreference

Drop the `table_size_preference` column from `artist_profiles`.

**Requirements:** REQ-5, REQ-20

**Files:**
- `src/lib/db/schema/artist-profiles.ts` — remove the `tableSizePreference` column.
- `src/lib/db/migrations/NNNN_*.sql` — generated drop-column migration.
- `src/lib/profile/completeness.ts` — remove the field from `ArtistProfileData`, the logistics fields array, and the `logisticsFields.length` math. Total drops by 1.
- `__tests__/unit/lib/completeness.test.ts` — update assertions: `logistics.total` is 3, not 4; the overall % for an artist with all other fields set matches the new denominator.
- `src/lib/db/schema/applications.ts` — remove `tableSizePreference` from the `ProfileSnapshot` type.
- `src/app/(public)/events/[eventId]/actions.ts` — the spread that builds `profileSnapshot` in `applyToEvent` no longer references `artistProfile.tableSizePreference`.

**Approach:**
- Update schema; generate migration. Drop is destructive but purely removes metadata.
- Update `completeness.ts` + tests in the same commit to keep the suite green.
- Spec keeps the field on historical `profileSnapshot` JSONB rows — no back-population needed.

**Verification:** `npm test` passes; type checker happy; migration applies.
**Depends on:** none (can be done in parallel with task 1)

---

### 3. Schema — convention guidelines + event override

Add convention-level `guidelines` and per-event `guidelinesOverride`.

**Requirements:** REQ-6

**Files:**
- `src/lib/db/schema/conventions.ts` — add `guidelines` text (nullable).
- `src/lib/db/schema/events.ts` — add `guidelinesOverride` text (nullable).
- Migration.

**Approach:**
- Add columns; generate migration.
- No backfill — both are nullable and default to null.

**Verification:** Migration applies; type checker and tests pass.
**Depends on:** none

---

### 4. Schema — event table size options, max assistants, assistant fee

Add structured offering fields to `events`.

**Requirements:** REQ-7, REQ-8

**Files:**
- `src/lib/db/schema/events.ts` — add `tableSizeOptions` (jsonb, typed as `TableSizeOption[]`, default `[]`), `maxAssistants` (integer, notNull, default `0`), `assistantFeeNok` (integer, nullable).
- Export `TableSizeOption` type from the schema file for consumers.
- Migration.

**Approach:**
- `TableSizeOption = { id: string; label: string; dimensions: string; priceNok: number | null }`.
- Generate migration. Existing rows default to empty array / 0 / null.

**Verification:** Migration applies; queries on `tableSizeOptions` return `[]` for existing rows.
**Depends on:** none

---

### 5. Schema — applications.answers + guidelinesAcknowledgedAt

Add storage for application-level answers.

**Requirements:** REQ-11, REQ-17

**Files:**
- `src/lib/db/schema/applications.ts` — add `answers` (jsonb, typed as `ApplicationAnswers`, notNull, default `{}`), `guidelinesAcknowledgedAt` (timestamp, nullable). Export the new `ApplicationAnswers` type.
- Migration.

**Approach:**
- `ApplicationAnswers = { tableSizeOptionId?: string; assistants?: { count: number; names: string[] }; sharingStand?: { sharing: boolean; with?: string }; placementPreference?: string; additionalComments?: string; promotionConsent?: boolean }`.
- Each key optional so the registry controls which are present.
- Generate migration.

**Verification:** Migration applies; schema type exported and consumable.
**Depends on:** none (can be parallelised with 1–4)

---

### 6. Field registry — add source discriminator + application entries

Extend the registry with six new application-source entries and a `source` field on every entry.

**Requirements:** REQ-9, REQ-10, REQ-18, REQ-19

**Files:**
- `src/lib/db/field-registry.ts` — extend `FieldDefinition` with `source: "profile" | "application"`; extend `FieldSection` union with `"application"`. Annotate existing eleven fields as `source: "profile"`. Append six new entries with `source: "application"` and `section: "application"`: `tableSize`, `assistants`, `sharingStand`, `placementPreference`, `additionalComments`, `promotionConsent`. Each gets a human label and optional help text for the organizer UI.
- `src/lib/validations/convention.ts` — the existing `fieldConfigSchema` (Zod) needs to accept the six new keys. Extend the record shape.
- `__tests__/unit/lib/field-registry.test.ts` — add cases that: (a) new keys exist with correct source/section, (b) `FIELD_REGISTRY.filter(f => f.source === "application")` returns exactly six entries.

**Approach:**
- Define the six new entries with stable `key`s. Defaults match spec REQ-10 but defaults are not stored in the registry — they're what the organizer lands on when creating a new event (stored in the event row, not the registry).
- Keep the existing `SECTIONS` constant and add a fourth entry for the field editor UI.

**Verification:** `npm test -- field-registry` passes; type checker happy.
**Depends on:** none (doesn't depend on migrations)

---

### 7. Validation — applicationAnswersSchema

Central Zod schema for validating the new application-level inputs.

**Requirements:** REQ-14, REQ-18

**Files:**
- `src/lib/validations/application.ts` — new file exporting `applicationAnswersSchema(event: EventConfig): ZodSchema<ApplicationAnswers>` where `EventConfig` contains `fieldRequirements`, `tableSizeOptions`, `maxAssistants`. The schema conditionally requires fields based on `fieldRequirements[key] === "required"` and validates ranges (`assistants.count <= maxAssistants`, `tableSizeOptionId` must match an existing option id).
- `__tests__/unit/lib/application-validation.test.ts` — extend existing file (already covers profile-side validation) with cases for the new schema: each `required`/`optional`/`not_requested` combination, invalid table-size id, over-max assistants, name list length mismatch.

**Approach:**
- Use `z.object()` with conditional `.refine()` checks or `z.discriminatedUnion` as needed.
- `guidelinesAcknowledged` is validated separately (not part of this schema) because it's a hard gate.

**Verification:** `npm test -- application-validation` passes; types align with `ApplicationAnswers` from the schema file.
**Depends on:** 5, 6

---

### 8. Profile editor — three sections with section tag

Rewrite the Portfolio card as three sections and wire image upload/reorder/delete to include `section` and `caption`.

**Requirements:** REQ-1, REQ-2, REQ-3

**Files:**
- `src/app/(authenticated)/dashboard/profile/page.tsx` — replace the single `<PortfolioGallery>` card with three section cards: "Promo", "Products", "Previous Stands". The server fetch of `portfolioImages` filters or groups by `section`; pass each slice to its own `<PortfolioGallery>` instance.
- `src/components/profile/portfolio-gallery.tsx` — accept a new `section: PortfolioSection` prop and an `allowCaption: boolean` prop. The `<ImageUploadZone>` now posts with a `section` form field. The reorder PUT stays keyed on image ids (reorder is per-section). Caption edit uses a small inline form per image (only rendered when `allowCaption`).
- `src/app/api/portfolio/route.ts` — accept `section` on POST (create) and `section` + `caption` on a new PATCH (update metadata). DELETE unchanged. Upload persists `section` to the new column.
- `src/app/api/portfolio/reorder/route.ts` — scope reorder to a single section (payload gains `section: PortfolioSection`); server computes sort order within that subset.
- `src/components/profile/completeness-indicator.tsx` — label changes: "Portfolio" → "Images" (or similar) to stop referring to the removed Portfolio section name; or leave alone if the label is already neutral. Review during implementation.
- `__tests__/components/portfolio-gallery.test.tsx` — new or extended tests asserting: three sections render independently; uploads respect the `section` prop; caption input appears only for `previous_stand`.

**Approach:**
- Keep the dnd/sortable UX per-section. Images don't move between sections via drag (cross-section move is a future feature — out of scope).
- The upload API infers `section` from the POST body; default to `"product"` if absent (belt and braces for older clients).
- Caption is a separate PATCH so drag-reorder POSTs don't overwrite it.

**Verification:** Manual: upload to each section, reorder within a section, add a caption to a Previous Stands image. `npm test` passes.
**Depends on:** 1

---

### 9. Logistics form cleanup

Drop the table-size input from the Logistics form.

**Requirements:** REQ-5

**Files:**
- `src/components/profile/logistics-form.tsx` — remove the `tableSizePreference` input, its Zod schema entry, and any references in the submit action.
- `src/lib/validations/profile.ts` — remove `tableSizePreference` from the Zod schema used by the logistics form.
- `src/app/(authenticated)/dashboard/profile/logistics/actions.ts` (or wherever the server action lives) — remove the column from the DB update.
- Associated tests.

**Approach:**
- Touches the same areas as task 2 but on the UI side. Commit together if it makes the diff easier to read, or separate for history clarity.

**Verification:** Profile editor no longer shows a table-size field; `npm test` passes.
**Depends on:** 2

---

### 10. Convention editor — guidelines text

Add a guidelines text area to the convention settings editor.

**Requirements:** REQ-6, REQ-22

**Files:**
- `src/components/conventions/convention-profile-form.tsx` (or equivalent) — add a multi-line `textarea` bound to a new `guidelines` field; Zod schema picks it up.
- `src/lib/validations/convention.ts` — extend `conventionSchema` with `guidelines: z.string().optional()` (or max-length cap).
- The server action that writes the convention row updates the new column.
- Tests: extend existing form test if present.

**Approach:**
- Keep the text area appreciable (6+ rows) and show a small hint ("Shown on events unless overridden").

**Verification:** Manual: edit a convention, set guidelines, persists; appears on the convention row in DB.
**Depends on:** 3

---

### 11. Event editor — override, table size options, max assistants, assistant fee

Add structured inputs to the event edit form.

**Requirements:** REQ-6, REQ-7, REQ-8, REQ-22

**Files:**
- `src/components/conventions/event-form.tsx` — add fields:
  - `guidelinesOverride`: textarea (6+ rows); hint "Leave blank to use the convention's guidelines".
  - `tableSizeOptions`: dynamic rows of `{ label, dimensions, priceNok }` with add/remove; client-side generates `id` as UUID on add.
  - `maxAssistants`: number input (min 0, max reasonable cap).
  - `assistantFeeNok`: number input (nullable).
- `src/lib/validations/convention.ts` or a new `src/lib/validations/event.ts` — extend `eventSchema` accordingly.
- Server action `updateEvent` persists the new fields.
- Tests: `__tests__/integration/event-crud.test.ts` grows cases for round-tripping the new fields.

**Approach:**
- For `tableSizeOptions`, manage rows with local React state; on submit, serialise the array into the form as JSON string (existing form conventions). The server parses with Zod.
- Generating stable `id`s at add-time means edits that keep the same option don't invalidate existing applications.

**Verification:** Manual + test: create/edit an event, add/remove table sizes, set max assistants, save, reload, values persist.
**Depends on:** 3, 4

---

### 12. Field editor — surface application-source fields

Add an "Application form" section to the field config editor.

**Requirements:** REQ-9, REQ-21

**Files:**
- `src/components/conventions/field-config-form.tsx` — iterate `FIELD_REGISTRY` filtered by `source === "application"`, grouped under a new section heading "Application form", below the three profile-source sections. Same `<select>` control per field.
- `src/app/(authenticated)/conventions/manage/events/[eventId]/fields/actions.ts` — the existing merge already reads all keys from the FormData; extend to include the six new keys. No other changes because merge is keyed by registry iteration.
- `src/lib/validations/convention.ts` — extend `fieldConfigSchema` to accept the six new keys (may already be done in task 6 if the schema is shared).
- Tests for the action.

**Approach:**
- Keep the existing "Copy from Event" behaviour — it already copies whatever keys are present in the source event's `fieldRequirements`.

**Verification:** Manual: open the fields editor for an event, see the new section with six fields, toggle, save, reload. `npm test -- field-config` passes.
**Depends on:** 6

---

### 13. Application form — guidelines + dynamic inputs

Rewrite the apply surface from a single button into a real form.

**Requirements:** REQ-12, REQ-13, REQ-14, REQ-15, REQ-16

**Files:**
- `src/components/events/apply-button.tsx` — rename conceptually or replace with `<ApplicationForm>` that renders:
  - A guidelines block (markdown-ish plain text) resolved from `event.guidelinesOverride ?? convention.guidelines`.
  - A mandatory checkbox "I have read and understood the guidelines".
  - Dynamic inputs for each application-source registry entry whose `fieldRequirements[key] !== "not_requested"`, in registry order.
  - Table size options rendered as radio selection with label, dimensions, and price.
  - Assistants: numeric picker `0..maxAssistants`; when N > 0, N "Assistant name" text inputs; side panel shows fee math if `assistantFeeNok` is set.
  - Sharing stand: yes/no radio; text input appears when yes.
  - Placement preference / additional comments: textareas.
  - Promotion consent: checkbox, defaults to true unless registry says otherwise.
  - Submit button disabled until guidelines checkbox is ticked and all required fields are valid.
- `src/app/(public)/events/[eventId]/page.tsx` — pass the guidelines + event config data into the new form component (it already fetches the event; extend the select to include convention.guidelines, event.guidelinesOverride, tableSizeOptions, maxAssistants, assistantFeeNok, fieldRequirements).
- Tests: `__tests__/components/application-form.test.tsx` — new component tests covering: required-field gating, disabled submit until guidelines ticked, assistants name inputs appear per count, table size selection.

**Approach:**
- Client component; holds form state with `useState` (or `useActionState` if passing through the action). Given the dynamic shape, controlled inputs + a single `useActionState` submit handler is cleanest.
- The form ignores fields whose registry state is `"not_requested"` — they're not rendered at all.

**Verification:** `npm test -- application-form` passes; manual QA at dev-server stage covers each path.
**Depends on:** 3, 4, 5, 6, 7

---

### 14. applyToEvent — accept + validate + store answers

Extend the server action to consume the new inputs.

**Requirements:** REQ-11, REQ-14, REQ-17

**Files:**
- `src/app/(public)/events/[eventId]/actions.ts` — `applyToEvent`:
  - Reads from FormData: `guidelinesAcknowledged` (must be "true"); the new application-source field keys into a shape parseable by `applicationAnswersSchema`.
  - Fetches the convention (for guidelines resolution and for general cross-checks if needed).
  - Builds `answers: ApplicationAnswers` by calling `applicationAnswersSchema(event).parse(raw)`.
  - Insert: `db.insert(applications).values({ ..., answers, guidelinesAcknowledgedAt: new Date() })`.
  - If acknowledgment is missing, return `{ error: "Guidelines must be acknowledged" }` before touching storage.
  - Existing profile-validation, status gate, blocklist, and snapshot copying stay unchanged.
- `__tests__/integration/apply-to-event.test.ts` — extend to cover: acknowledgment blocked; answers persisted; invalid tableSizeOptionId rejected; over-max assistants rejected; optional fields omitted round-trip as undefined.

**Approach:**
- Keep the R2 image-copy logic untouched — that's orthogonal.
- Store `guidelinesAcknowledgedAt` as `new Date()` when the checkbox comes through; if absent, never reach the insert.

**Verification:** `npm test -- apply-to-event` passes; manual end-to-end submit from the new form writes a valid row.
**Depends on:** 5, 7, 13

---

### 15. Event detail — guidelines disclosure + page wiring

Surface convention/event guidelines on the event detail page when a signed-in user sees it so the apply form's gating doesn't come out of nowhere.

**Requirements:** REQ-12 (supporting)

**Files:**
- `src/app/(public)/events/[eventId]/page.tsx` — new `SectionCard label="Guidelines"` rendered above the existing apply section. Only visible when a session exists (mirrors the gating from the recent event-detail change). Content is `event.guidelinesOverride ?? convention.guidelines ?? null`; if both are null, omit the section.

**Approach:**
- Render as a `whitespace-pre-line` paragraph for now; rich-text support is out of scope.

**Verification:** Manual check signed-out (nothing) vs signed-in (guidelines block visible) with both event-override-set and convention-default-only cases.
**Depends on:** 3

---

### 16. Organizer review UI — surface new answers

Expose the new answers to organizers in the application review workflow.

**Requirements:** REQ-17 (supporting)

**Files:**
- Whatever review component renders a single application (grep for `profileSnapshot` consumers in `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/` and related components).
- Add a read-only display of: selected table size (resolved against event options for label/dimensions), assistants count + names, sharing stand info, placement preference, additional comments, promotion consent, guidelines acknowledgment timestamp.

**Approach:**
- No new schema; resolve `answers.tableSizeOptionId` against `event.tableSizeOptions` at render time.
- Organizer-only change; does not affect the artist UX.

**Verification:** Manual: apply as artist with answers; view as organizer; all fields visible.
**Depends on:** 14

---

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 8 |
| REQ-2 | 1, 8 |
| REQ-3 | 1, 8 |
| REQ-4 | 1 |
| REQ-5 | 2, 9 |
| REQ-6 | 3, 10, 11, 15 |
| REQ-7 | 4, 11 |
| REQ-8 | 4, 11 |
| REQ-9 | 6, 12 |
| REQ-10 | 6, 13 |
| REQ-11 | 5, 14 |
| REQ-12 | 13, 15 |
| REQ-13 | 13 |
| REQ-14 | 7, 13, 14 |
| REQ-15 | 13 |
| REQ-16 | 13 |
| REQ-17 | 5, 14, 16 |
| REQ-18 | 6, 7 |
| REQ-19 | 6 |
| REQ-20 | 2 |
| REQ-21 | 12 |
| REQ-22 | 10, 11 |

## Risks

- **Field registry churn ripples.** Changing `FieldDefinition` to include `source` touches every existing consumer — validator, field-config editor, profile-validation code. Any missed consumer becomes a TypeScript error rather than a silent bug, but review the blast radius carefully during task 6.
- **Application form complexity.** Task 13 is the largest single task (dynamic inputs, table-size radio, assistants count+names, controlled state, acknowledgment gate). Consider splitting during implementation if the PR becomes unwieldy — the natural seam is "guidelines + acknowledgment" as one commit and "dynamic answer inputs" as a second.
- **Migration ordering with local-only data.** Tasks 1–5 each generate a drizzle migration. If they're committed out of order, the generated filenames may clash or fail to apply. Generate and apply each migration locally before committing, and rebase migration numbers if necessary.
- **TableSizeOption `id` stability.** If an organizer deletes a table size option that a submitted application references, the review UI in task 16 must handle the null lookup gracefully. Store the `id` on the application but render "Option no longer available" if the lookup misses.
- **ProfileSnapshot divergence.** Existing applications have `profileSnapshot.tableSizePreference`; new ones don't. The review UI must not assume the field is present when it reads historical rows. The type change in task 2 removes it from reads — ensure organizer review code handles `undefined` gracefully.
- **Field-config `updateFieldConfig` action pathway.** The existing action iterates `FIELD_REGISTRY` to build the output JSONB. Once the six new keys land in the registry, every new event save includes them in `fieldRequirements` regardless of whether the organizer intentionally touched them. Default them to `"not_requested"` unless the form sent something else. Verify this during task 12.
