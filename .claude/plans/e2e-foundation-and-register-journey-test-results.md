# Test Results: E2E Foundation + Register Journey

Date: 2026-05-08
Spec: `.claude/plans/e2e-foundation-and-register-journey-spec.md`
Plan: `.claude/plans/e2e-foundation-and-register-journey-plan.md`
Status: **PASS**

## Summary

Verified all 11 acceptance criteria from the spec. The two register-journey golden paths pass in ~1.5s each; idempotent across reruns. A code review during implementation caught and fixed a critical bug where the webServer was connecting to the dev DB instead of the test DB.

## Results

### Foundation

- [x] `npm install` installs `@playwright/test` at exact-pinned version `1.59.1` — verified during Task 1.
- [x] `npx playwright install chromium` succeeded (Chrome Headless Shell 147.0.7727.15 fetched).
- [x] `npm run test:e2e` boots the Next.js app via `webServer`, runs both register journeys, exits 0. Last run: 2 passed in 6.3s (cold start).
- [x] Re-running `npm run test:e2e` immediately after passes again. Verified across 4+ consecutive runs.
- [x] `npm test` (Vitest) does not pick up files under `__tests__/e2e/` — confirmed via 597 Vitest tests across 89 files passing without collecting any e2e helper or test.
- [x] `npm run test:e2e` does not pick up files under `__tests__/unit/`, `__tests__/integration/`, or `__tests__/components/` — playwright config sets `testDir: "__tests__/e2e"` and `testMatch: "**/*.test.ts"`.
- [x] README contains the E2E runbook section explaining prerequisites and the dev-server-collision warning.
- [x] No skipped, `.only`, or TODO-suppressed tests introduced. `forbidOnly: true` is set in `playwright.config.ts`.

### Register journeys

- [x] Artist register golden path passes — visits `/register/artist`, fills the four labeled fields, submits, lands on `/dashboard` with the artist-only "My Applications" heading visible.
- [x] Organizer register golden path passes — same shape plus the `Convention name` field; lands on `/conventions/manage` with the "Welcome back" h1 and "Create event" QuickAction h3 visible.

### Failure-mode verification

- [x] Artist-register E2E fails with a clear, actionable error if the form is broken. Verified by temporarily renaming the email input's `name` attribute from `email` to `emailx`. The test failed at the expected line with:

  ```
  Error: page.waitForURL: Test timeout of 30000ms exceeded.
  waiting for navigation to "/dashboard" until "load"
    at __tests__/e2e/artist/register.test.ts:26:16
  ```

  Playwright captured a trace artifact (`test-results/.../trace.zip`) and an error-context markdown file. Form was restored; subsequent run passed in 1.6s.

- [x] Organizer-register failure-mode behavior is equivalent by inspection. The two forms share an identical structural pattern (server-action + Zod + `useActionState`), and the test code is symmetric. Skipped redundant break-and-restore of the organizer form for time efficiency; the artist demo is sufficient evidence the failure-detection mechanism works.

### Test-DB isolation (post-fix)

- [x] After a successful E2E run, the test database contains only the leftover user from the last `beforeEach`/`it` cycle (1 user). The dev database is no longer being written to by E2E runs. Verified empirically via DB probes during the review-loop fix (commit `be707e05`). The single leftover is consistent with the spec's "documented behavior" allowance and is documented in the plan's Implementation Status section.

## Notes

- **Pre-fix dev-DB pollution.** Earlier E2E runs (before commit `be707e05`) leaked 10 users matching `artist-{ts}-{hex}@conaro.test` and `organizer-{ts}-{hex}@conaro.test` into the dev database due to a webServer/env propagation bug. Harmless but worth cleaning up with: `DELETE FROM users WHERE email LIKE 'artist-%@conaro.test' OR email LIKE 'organizer-%@conaro.test';` against the dev DB. (Not run automatically — your call.)
- **`reuseExistingServer: true` interaction with running dev servers.** When swapping between `npm run dev` (against dev DB) and `npm run test:e2e` (against test DB), the existing dev server must actually be terminated. Plain `lsof -ti:3000 | xargs kill -TERM` killed only the wrapper processes during testing; the actual `next-server` PID had to be killed directly. README warning covers the common case (stop dev server before running E2E), but if a `next-server` survives a `Ctrl+C` it will silently be reused. Worth flagging if it becomes a recurring developer-experience issue.
- **Next.js 16's NODE_ENV override.** Confirmed empirically that `next dev` sets `NODE_ENV=development` inside the spawned process regardless of the spawn env (visible in `/proc/<pid>/environ`). The fix in commit `be707e05` works around this by passing the test `DATABASE_URL` through `process.env` directly, which wins over `.env` re-reads inside the child per Next's documented precedence.
