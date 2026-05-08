# E2E Foundation + Register Journey

## Problem Statement

The Conaro project currently has zero E2E test coverage. STANDARDS.md mandates Playwright tests for critical user journeys (registration, profile setup, apply to event, review applicants, publish results), but `@playwright/test` is not installed, no `playwright.config.ts` exists, and `__tests__/e2e/` does not exist. Registration is the foundation of every user journey — without it working end-to-end through the browser, no other E2E test can build on it. This spec covers installing Playwright, scaffolding the E2E directory structure with reusable patterns (DB reset, dev server, fixtures), and implementing the registration journey for both roles. Subsequent journeys (profile setup, apply, review, publish) will be specced separately once the foundation is proven.

Source: Batch E of `.claude/plans/test-coverage-audit-spec.md`.

## Requirements

- **REQ-1** Playwright is installed as a dev dependency at a pinned exact version (per STANDARDS.md dependency policy).
- **REQ-2** A `playwright.config.ts` exists at the repo root and configures Playwright to run against the local Next.js app and the project's test database.
- **REQ-3** The directory `__tests__/e2e/` exists with `artist/` and `organizer/` subfolders (per STANDARDS.md test structure).
- **REQ-4** A package.json script runs the E2E suite (e.g. `npm run test:e2e`) and is documented for local use.
- **REQ-5** The E2E suite uses the same test database as integration tests (configured via the existing test-DB env var) and applies migrations before the run.
- **REQ-6** The database is reset to a clean state at the start of each E2E test (or each test file, if file-level isolation is sufficient — implementation choice in the plan), so tests don't leak state into each other.
- **REQ-7** Each test generates a unique email so reruns don't collide and parallel concerns are explicit.
- **REQ-8** The Next.js app is started automatically by Playwright's `webServer` config — running `npm run test:e2e` requires no manual server-start step.
- **REQ-9** An E2E test verifies the artist registration golden path: a fresh visitor visits the artist-register URL, fills the form with valid credentials, submits, and ends up authenticated on the artist dashboard with the dashboard's primary content visible.
- **REQ-10** An E2E test verifies the organizer registration golden path: same as above but for organizer (with the additional convention-name field), ending on the organizer dashboard.
- **REQ-11** E2E tests are excluded from the existing `npm test` (Vitest) run and Vitest unit/integration tests are excluded from the Playwright run — the two suites do not interfere with each other.
- **REQ-12** The README (or another visible doc) is updated with a one-paragraph runbook: how to run E2E tests locally and what setup they require.

## Scope

### In Scope
- Installing `@playwright/test` and any required browsers (Chromium minimum).
- `playwright.config.ts` with `webServer`, baseURL, test DB env, and a clear default browser configuration.
- `__tests__/e2e/` with `artist/` and `organizer/` subdirectories.
- A small set of E2E helper utilities (DB reset, unique-email generator, login/register helpers as needed for these two tests).
- Two E2E tests: artist registration golden path, organizer registration golden path.
- `npm run test:e2e` script and documentation in the README.
- Vitest config update so the two suites don't pick up each other's files.

### Out of Scope
- The other four critical journeys (profile setup, apply to event, review applicants, publish results) — separate specs.
- CI / GitHub Actions wiring — separate initiative.
- Multi-browser testing (Firefox, WebKit) — Chromium only for the foundation; can be added later without spec churn.
- Mobile viewport testing — defer.
- Visual regression testing / screenshots — defer.
- Testing validation errors, password-mismatch UI, or email-already-exists UI — already covered at unit/integration/component layers.
- Auth via stored cookies / `storageState` (login-once optimization) — only relevant once we have multiple authenticated journeys; defer to whichever spec needs it first.
- Performance/load testing.

## Acceptance Criteria

These are verified during manual testing (step 5 of the workflow). Each must be checked off before the feature is considered complete.

- [x] Running `npm install` after pulling the branch installs `@playwright/test` at the pinned version.
- [x] Running `npx playwright install chromium` (or the documented equivalent) succeeds.
- [x] `npm run test:e2e` starts the Next.js app automatically, runs both register journeys against the test database, and exits with code 0.
- [x] Re-running `npm run test:e2e` immediately after a successful run also passes (i.e., the suite is idempotent — no leftover state breaks the second run).
- [x] The artist-register E2E test fails if the artist register form is broken (verified by temporarily breaking the form and confirming the test fails with a clear error).
- [x] The organizer-register E2E test fails if the organizer register form is broken (same verification).
- [x] `npm test` (Vitest) does not pick up any file under `__tests__/e2e/`.
- [x] `npm run test:e2e` does not pick up any file under `__tests__/unit/`, `__tests__/integration/`, or `__tests__/components/`.
- [x] The README contains a section explaining how to run E2E tests locally and any prerequisites (test DB, migrations).
- [x] After a successful E2E run, the test database contains no leftover users from the run (or at minimum, this is documented behavior — see plan).
- [x] No skipped, `.only`, or TODO-suppressed tests are introduced.

## Constraints

- **Test DB only** — per `.claude/rules/safety.md`, all migrations and queries must target localhost only. The Playwright config must read the test database connection from the existing test-DB environment variable (the one used by `db:migrate:test`); it must never fall back to or default to a non-test DB.
- **Pinned exact versions** — per STANDARDS.md, `@playwright/test` is added with no `^` or `~` prefix.
- **kebab-case file names** — per STANDARDS.md, e.g. `artist-register.test.ts`, not `artistRegister.test.ts`.
- **No skipped or `.only` tests** — per STANDARDS.md and the audit's clean-hygiene baseline.
- **Tests must be deterministic** — no reliance on real wall-clock time, no flakey waits. Use Playwright's built-in auto-waiting and explicit assertions.
- **The dev/prod-build choice for `webServer`** is left to the implementation plan but must be documented in the plan with reasoning.
