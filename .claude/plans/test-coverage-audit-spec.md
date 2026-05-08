# Test Coverage Audit — 2026-05-08

## Summary

- **Source files inventoried**: 58 lib/, 18 API routes (route.ts), 18 server-action files (actions.ts + thread-actions.ts), 88 feature components (excludes shadcn `ui/`).
- **Test files**: 18 unit, 31 integration, 38 component, **0 E2E** (no `__tests__/e2e/` directory, Playwright not in `package.json`).
- **High-severity gaps**: 5 service modules untested, 7 server-action files / route.ts modules untested, **all 5 critical user journeys lack E2E coverage** (Playwright not installed).
- **Test quality issues**: 0 skipped tests, 0 `it.only`, 0 TODO-suppressed tests. Existing tests appear healthy. The TODO match in `auth-sidebar-nav.test.tsx:64` is asserting that source code contains a marker — not a disabled test.

## Methodology

1. Enumerated `src/lib/**/*.ts` (excluding schema/types/index re-exports), `src/app/**/{route,actions,thread-actions}.ts`, `src/components/**/*.tsx` (excluding `ui/`).
2. For each integration test, grepped its `import` statements to determine which action/route/query it exercises. Mapped that against the route/action inventory.
3. For each unit test name, matched against `src/lib/` filenames. Inspected exports (`grep -E "^export (async )?(function|const)"`) on untested files to assess whether a test is warranted.
4. For components, compared `__tests__/components/*.test.tsx` filename stems to `src/components/**/*.tsx` basenames.
5. Searched for skipped/`only`/TODO patterns across `__tests__/`.
6. STANDARDS.md bar applied: every service function, every API route/action, every Zod schema, and every critical user journey must have its corresponding test layer.

---

## Findings by layer

### 1. Unit tests (lib/)

**Untested service files (HIGH):**

- `src/lib/notifications/service.ts` — exports `createNotifications`, `getNotificationsForProfile`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `getEmailPreference`. Core notification CRUD layer. Currently only exercised indirectly by `__tests__/integration/notifications.test.ts`; no isolated unit test of these helpers.
- `src/lib/notifications/triggers.ts` — exports 7 `notify*` functions (event published, event opened, results published, application revoked, new application, thread message artist→org, thread message org→artist). These wrap business rules (preference checks, follow-list expansion). Worth direct unit tests around recipient resolution and idempotency, separate from full integration tests.
- `src/lib/events/event-context.ts` — exports `getEventViewerContext` (cached) plus 8 `shouldShow*Tab` predicates and `hasAssignedTableForViewer`. Visibility logic for both artist and organizer event views. Currently untested.
- `src/lib/applications/artist-visible-status.ts` — `artistVisibleStatus()` maps internal status → artist-facing label. Pure function, easy to unit-test, important to lock down.
- `src/lib/storage/image.ts` — `processImage(buffer)` does sharp resize/compression. Touchpoint for STANDARDS image-handling rules; exercise with small fixture buffers.

**Untested utilities (MEDIUM):**

- `src/lib/artist-profile/social-links.ts` — `parseSocialLinks`, `serializeSocialLinks`, `isLikelyUrl`. Pure parsers; should have a small test.
- `src/lib/artist-profile/tags.ts` — `normalizeTag(raw)` (trim, lowercase, etc.). Pure function.
- `src/lib/db/errors.ts` — `isUniqueViolation(error)`. Used by registration to surface friendly errors; should test against a fake `pg` error shape.
- `src/lib/auth/secure-compare.ts` — `secureCompare(a, b)`. Constant-time comparison; small but security-sensitive — worth a test that confirms it returns false on length mismatch and never short-circuits.
- `src/lib/events/announcements.ts` — `getEventAnnouncements()` is a thin DB query; could fold into an integration test instead.
- `src/lib/events/status-display.ts` — only constant maps; arguably no test needed (LOW).

**Untested Zod validation schemas (HIGH per STANDARDS):**

- `src/lib/validations/branding.ts` (`headerColorBodySchema`)
- `src/lib/validations/guests.ts` (`socialLinkSchema`, `guestSchema`, `guestsSchema`)
- `src/lib/validations/programme.ts` (`programmeItemSchema`, `programmeSchema`, `isDateWithinEvent`)

STANDARDS.md is explicit: *"All Zod validation schemas must have tests for valid and invalid inputs."* Three of the seven validation modules currently lack tests.

**Already tested:** 18 unit test files cover application validation, completeness, field registry, floor-plan geometry/snap, initials, landing cover-gradient, messaging template, format/markdown utils, and validations for application/auth/convention/profile.

---

### 2. Integration tests (API routes & server actions)

**Untested server actions (HIGH):**

- `src/app/(authenticated)/conventions/manage/events/[eventId]/announcements/actions.ts` — `createEventAnnouncement`, `updateEventAnnouncement`, `deleteEventAnnouncement`. Only the *query* side (`recent-announcements.test.ts`) is covered; create/update/delete actions have no test (auth, ownership, validation paths all uncovered).
- `src/app/(authenticated)/dashboard/profile/actions.ts` — `updateBasicInfo`, `updateLogistics`. Artist profile mutation actions; the artist profile is the foundation of the apply flow. Currently zero integration coverage.

**Untested API route handlers (HIGH):**

- `src/app/api/notifications/route.ts` (GET) — list notifications for current user.
- `src/app/api/notifications/read/route.ts` (POST) — mark single notification read.
- `src/app/api/notifications/read-all/route.ts` (POST) — mark all read.
- `src/app/api/portfolio/route.ts` (POST, DELETE, PATCH) — upload, delete, edit portfolio images. Critical for artist profile journey.
- `src/app/api/portfolio/reorder/route.ts` (PUT) — reorder portfolio gallery.
- `src/app/api/artists/search/route.ts` (GET) — used by organizer artist-list manager; auth-gated and parameter-validated.
- `src/app/api/uploads/[...path]/route.ts` (GET) — serves uploaded files in local-storage mode; ownership/auth surface.
- `src/app/api/conventions/{banner,banner-mobile,header-color,logo}/route.ts` — 4 banner/branding upload routes for conventions.
- `src/app/api/events/[eventId]/{banner,banner-mobile,header-color,guests/image}/route.ts` — 4 event-level branding upload routes.

That's **15 route.ts files with no integration test**, including the entire notifications API surface and the entire portfolio API surface.

**Trivial / acceptable to skip:** `src/app/api/auth/[...nextauth]/route.ts` is a pass-through to NextAuth and doesn't need its own test.

**Already tested:** Convention profile, convention lists, event CRUD/publish, field config, floor-plan publish/save/queries/schema, guests, programme, applications review/publish, apply-to-event, follows, threads (artist and organizer), login, register-artist, register-organizer, notification-preferences, notifications (general), landing data, current-event, application-counts, recent-announcements, db-reset cron, event-tick cron, R2 + storage adapter selection. **31 integration tests in total.**

---

### 3. Component tests

**Untested feature components (MEDIUM, prioritized):**

Critical-flow components (worth tests soon):
- `src/components/auth/{login-form,artist-register-form,organizer-register-form,logout-button}.tsx` — entire auth UI is untested.
- `src/components/events/{application-form,apply-button,join-waitlist-button,applicant-context,artist-event-tabs-nav}.tsx` — apply flow UI.
- `src/components/notifications/{notification-bell,notification-list,notification-preferences-form}.tsx` — notification UX.
- `src/components/conventions/{field-config-form,announcements-editor,programme-editor,guests-editor,artist-list-manager,artist-search-dialog,publish-results-button,event-status-controls,event-tabs-nav,header-color-picker,banner-upload,convention-logo-upload}.tsx` — organizer event/convention management.
- `src/components/conventions/selection/{image-lightbox,portfolio-collage,portfolio-rows,representation-cloud,waitlist-controls}.tsx` — selection workspace pieces (sibling pieces are tested).
- `src/components/conventions/{template-token-reference,thread-dialog-contents}.tsx`.
- `src/components/profile/{social-links-editor,image-upload-zone}.tsx` — profile inputs.
- `src/components/landing/{follow-button,landing-header,public-rail,filter-chips,city-chips,artist-rail,rail-cards/{brand-cta-card,browse-by-city-card,notifications-card,profile-completeness-card}}.tsx` — landing page pieces (some tested: event-card, featured-event, jump-to-month-card, etc.).
- `src/components/floor-plans/{public-floor-plan-view,floor-plan-editor,floor-plan-canvas,floor-plan-canvas-dynamic,polygon-editor-layer,drag-snap-guides-layer,edge-length-popup,edit-label-dialog,edit-table-dialog}.tsx` — bulk of floor-plan UI is canvas-heavy and harder to test (lower priority).
- `src/components/layout/{auth-shell,public-shell,public-mobile-menu,public-nav-links,avatar-menu,landing-header,providers}.tsx` — layout chrome.

**Already tested:** 38 component test files covering UI primitives plus selection workspace, conventions/event forms, dashboard views, floor-plan publish/sidebar, landing cards, completeness indicator, basic-info form, logistics form, portfolio gallery, response templates, room switcher, threads inbox + thread, theme toggle, auth sidebar nav, markdown, segmented, chip-select.

---

### 4. E2E tests

**Major gap.** `__tests__/e2e/` does not exist. Playwright is not in `package.json` (no `@playwright/test` dependency, no `playwright.config.ts`, no test scripts referencing Playwright). There is **zero E2E coverage**.

STANDARDS.md mandates Playwright for these critical journeys; all five are uncovered:

1. Registration (artist + organizer)
2. Profile setup (artist)
3. Apply to event (artist)
4. Review applicants (organizer)
5. Publish results (organizer)

The integration tests cover the underlying server actions, but no test exercises the browser-level flow.

---

### 5. Test quality issues

- **No skipped or `only` tests.** `grep -rEn "it\.skip|describe\.skip|xit|xdescribe|\.todo\(|\.only\("` returned no matches.
- **No commented-out tests detected** in spot checks.
- **No TODO-suppressed tests.** The single `TODO` match in `__tests__/components/auth-sidebar-nav.test.tsx:64` is asserting that the source contains a `TODO(messaging)` marker — i.e. it is a *test*, not a disabled one.
- **Mocking discipline (spot check):** integration tests under `__tests__/integration/` consistently import `@/lib/db` and operate on real tables (e.g. `apply-to-event`, `event-crud`, `register-artist`). The R2 / storage adapter tests use `aws-sdk-client-mock`, which is appropriate for an external service. Storage-adapter-selection appears to test the selection logic without a live bucket. No "heavily mocked DB" smell found in the integration suite.
- **Test runner:** `vitest.config.ts` exists; `npm test` runs Vitest. No Playwright runner configured.

---

## Recommended triage groups

Each batch is sized to be one PR / one plan-spec cycle.

- **Batch A — Notifications API + service unit tests** (HIGH).
  Add unit tests for `src/lib/notifications/service.ts` and `src/lib/notifications/triggers.ts`; add integration tests for the three `src/app/api/notifications/{route,read,read-all}.ts` handlers. Closes the entire notifications surface.

- **Batch B — Portfolio + uploads API integration tests** (HIGH).
  `src/app/api/portfolio/route.ts` (POST/DELETE/PATCH), `portfolio/reorder` (PUT), `uploads/[...path]/route.ts` (GET), plus `artists/search/route.ts` (GET). Covers artist profile media + organizer artist search. Wire into the existing R2 adapter mock pattern.

- **Batch C — Branding upload routes + missing Zod schema tests** (MEDIUM-HIGH).
  Tests for the 8 banner/header-color/logo route handlers (4 convention-level, 4 event-level) and the three untested Zod modules: `validations/branding.ts`, `validations/guests.ts`, `validations/programme.ts`. Closes the validation-coverage gap mandated by STANDARDS.md.

- **Batch D — Untested server actions + event-context unit tests** (HIGH).
  Integration tests for `dashboard/profile/actions.ts` (`updateBasicInfo`, `updateLogistics`) and `events/[eventId]/announcements/actions.ts` (create/update/delete). Unit tests for `lib/events/event-context.ts` visibility predicates and `lib/applications/artist-visible-status.ts`. Plus quick tests for `lib/db/errors.ts`, `lib/auth/secure-compare.ts`, and the artist-profile parsers.

- **Batch E — Playwright E2E foundation + critical journeys** (HIGH, largest).
  Install `@playwright/test`, add `playwright.config.ts` and `__tests__/e2e/` (with `artist/` and `organizer/` subfolders per STANDARDS.md). Wire scripts into `package.json` and CI. Implement the five mandated journeys: register, profile setup, apply, review, publish. This is a multi-PR initiative; could split foundation + register journey into one PR and then one journey per PR.

- **Batch F (optional, MEDIUM) — Critical-flow component tests.**
  Component tests for the auth forms (`login-form`, `artist-register-form`, `organizer-register-form`), the apply flow (`application-form`, `apply-button`, `join-waitlist-button`), and notifications UI (`notification-bell`, `notification-list`, `notification-preferences-form`). These would partly substitute for E2E in the short term while Batch E ramps.
