# Artist Profile Restructure & Application Form Fields

## Problem Statement

The current artist profile bundles everything together under a single "Portfolio" image gallery and stores `tableSizePreference` as a profile-level field. Real-world convention application forms (Metrocon, Torucon, ConPASSION, KawaiiCon, Animanga, Banzaicon) show that (a) artists think of their portfolio in three distinct buckets (promotion imagery, example products, photos of previous stands), (b) table size and assistant/helper choices are event-specific (tied to the event's pricing), and (c) every convention gates the application behind a "read and understood the guidelines" checkbox. The current system has none of this — the application form is a bare Apply button that snapshots the profile, with no artist-entered per-event answers.

## Requirements

### Artist profile

- [REQ-1] The "Portfolio" section heading and wording is removed. Replaced by three sections: **Promo**, **Products**, **Previous Stands**.
- [REQ-2] Portfolio images are stored as a single ordered collection but each image carries a `section` tag (`promo` | `product` | `previous_stand`). Images can be moved between sections.
- [REQ-3] "Previous Stands" images support an optional text caption per image. Promo and Products images do not show a caption field.
- [REQ-4] Existing portfolio images migrate into the `product` section by default.
- [REQ-5] The `tableSizePreference` column on `artist_profiles` is removed. The field registry entry for `tableSizePreference` and its use in profile completeness and the `ProfileSnapshot` type are removed.

### Convention / event data

- [REQ-6] Conventions gain a `guidelines` text field (nullable, long-form). Events gain a `guidelinesOverride` text field (nullable); if set, it overrides the convention's guidelines for that event.
- [REQ-7] Events gain a structured `tableSizeOptions` field (array of `{ id, label, dimensions, priceNok }`). The freeform `tableDimensions` and `priceInfo` columns on events remain for now to avoid migrating historical data and because non-artstand events may not use structured options.
- [REQ-8] Events gain `maxAssistants` (integer, default 0) and `assistantFeeNok` (integer, nullable).

### Application-level fields

- [REQ-9] A new "application-source" field registry is introduced alongside the existing profile-source one, so organizers can toggle application-time fields per event (required / optional / not_requested).
- [REQ-10] The following application-level fields are introduced, each registry-toggleable:
  - `tableSize` — artist picks one of the event's `tableSizeOptions`. Default: required if the event defines options, else not_requested.
  - `assistants` — artist enters a count (0 ≤ N ≤ `event.maxAssistants`) and a list of N names. Default: optional if `event.maxAssistants > 0`, else not_requested.
  - `sharingStand` — yes/no; if yes, a name / contact text. Default: optional.
  - `placementPreference` — free text ("I'd like to be placed next to X" / location preference). Default: optional.
  - `additionalComments` — free text. Default: optional.
  - `promotionConsent` — yes/no. Default: optional (defaults to yes on submission unless artist unchecks).
- [REQ-11] A `guidelinesAcknowledgedAt` timestamp is recorded on every submitted application and is always mandatory regardless of registry state — the form cannot submit without it. This field is not part of the toggleable registry.

### Application form UX

- [REQ-12] The application form renders the guidelines text (convention default, or the event's override) in-line, followed by a mandatory acknowledgment checkbox.
- [REQ-13] The form renders inputs for each application-level field whose registry requirement for the event is `required` or `optional`. `not_requested` fields are not rendered.
- [REQ-14] Required application-level fields block submission. Client-side validation matches server-side validation.
- [REQ-15] If the event defines `tableSizeOptions` and the field is required/optional, the form renders them as selectable options showing label, dimensions, and price (when set).
- [REQ-16] If `event.maxAssistants > 0` and the assistants field is required/optional, the form renders a numeric picker `0..maxAssistants` and, when N > 0, that many "Assistant name" text inputs. When `assistantFeeNok` is set, the form shows the added cost for N assistants.
- [REQ-17] On successful submission the application record stores the artist's answers in new columns on the `applications` table, alongside the existing `profileSnapshot`.

### Field registry + validation

- [REQ-18] The existing profile-source field registry continues to validate that the artist's profile has the data required by the event's `fieldRequirements`. The new application-source registry drives the form's inputs and the server-side application-submission validation.
- [REQ-19] The field registry is authoritative: introducing a new per-event field means adding it to the registry (plus a column on `applications` if it needs to be stored), with no other config.
- [REQ-20] Profile-completeness logic no longer references `tableSizePreference`. The Logistics section's total drops by one. Overall-percent math updates accordingly.

### Organizer editing

- [REQ-21] The organizer's "event fields" editor lists both the profile-source fields (as today) and the new application-source fields, toggleable per event with the same `required | optional | not_requested` control.
- [REQ-22] The organizer's event settings editor exposes inputs for `tableSizeOptions` (add/remove rows), `maxAssistants`, `assistantFeeNok`, and `guidelinesOverride`. The convention settings editor exposes the convention-level `guidelines` text.

## Scope

### In Scope

- DB schema changes: `artist_profiles.tableSizePreference` removed; `portfolio_images.section` enum added; `portfolio_images.caption` added; `conventions.guidelines` added; `events.guidelinesOverride` / `tableSizeOptions` / `maxAssistants` / `assistantFeeNok` added; new columns on `applications` for the new application-level answers and `guidelinesAcknowledgedAt`.
- Field registry split: an existing "profile-source" registry and a new "application-source" registry (or a unified registry with a `source` field — implementation detail).
- Profile editor UI: rename sections; three image collections with tag-based filtering; allow moving images between sections; Previous Stands caption field.
- Application form UI: rendered inputs for each registry-enabled application-level field; guidelines block + checkbox.
- Organizer event editor UI: structured table-size options, max assistants, assistant fee, guidelines override. Convention editor UI: guidelines text.
- Server-side validation for the new fields on submit.
- Migration of existing portfolio images into `section = 'product'`.
- Profile completeness updates.
- Tests for new schema, new form inputs, new validation.

### Out of Scope

- Structured product list (name / price / description). Products is images-only per REQ-2.
- Age confirmation / age-gate fields.
- "Have you had a stand before" field.
- Prior-applications-to-this-convention query (could be computed from history later).
- Multi-artist shared stands as first-class entities (we capture the sharing intent as text only; we do not join the sharing artist's profile).
- Ticket / payment wiring (price info is display-only per project direction).
- Translation / i18n of any new labels.
- Any change to the `ProfileSnapshot` serialization beyond removing `tableSizePreference`.
- Updating historical applications to conform to the new schema. New columns default to null for rows created before the migration.

## Acceptance Criteria

- [ ] The artist profile page shows three sections named Promo, Products, Previous Stands (no "Portfolio" heading anywhere).
- [ ] An artist can upload, reorder, and delete images within each section; a Previous Stands image can have an optional caption.
- [ ] Existing portfolio images appear under Products after the migration.
- [ ] `Table Size Preference` is not present anywhere in the profile editor, completeness indicator, or ProfileSnapshot type.
- [ ] An organizer can write a convention-wide guidelines text on the convention settings page.
- [ ] An organizer can override guidelines per event on the event settings page.
- [ ] An organizer can define a list of table size options per event (label, dimensions, price).
- [ ] An organizer can set `maxAssistants` and `assistantFeeNok` per event.
- [ ] An organizer can toggle each application-level field (`tableSize`, `assistants`, `sharingStand`, `placementPreference`, `additionalComments`, `promotionConsent`) per event via the fields editor.
- [ ] The application form shows the guidelines text (event override or convention default) and cannot be submitted without checking the acknowledgment checkbox.
- [ ] The application form renders exactly the application-level inputs whose registry entry is `required` or `optional` for that event; `not_requested` fields are absent.
- [ ] Required application-level fields are enforced both client-side and server-side.
- [ ] When the event defines table size options, the form presents them as selectable options with label, dimensions, and price.
- [ ] When `maxAssistants > 0`, the form presents a count picker and N name inputs; the form surfaces the added fee when `assistantFeeNok` is set.
- [ ] A successfully submitted application stores the artist's answers in the new columns and records `guidelinesAcknowledgedAt`.
- [ ] Profile completeness calculation no longer factors in `tableSizePreference`; the Logistics section shows three fields instead of four.
- [ ] All existing tests still pass; new tests cover the new schema, form inputs, and validation.

## Constraints

- Drizzle migrations must be generated via `drizzle-kit generate` and applied only against `.env.local` (per the project's safety rules).
- The existing `ProfileSnapshot` on historical `applications` rows stays as-is (we do not back-populate the new columns).
- The project standards in `STANDARDS.md` apply: camelCase / PascalCase / kebab-case conventions, Zod validation at boundaries, no raw SQL, transactions for multi-table writes, tests for new service functions and validation schemas.
