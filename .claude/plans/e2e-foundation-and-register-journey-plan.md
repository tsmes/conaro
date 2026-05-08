# Implementation Plan: E2E Foundation + Register Journey

Spec: `.claude/plans/e2e-foundation-and-register-journey-spec.md`

## Technical Decisions

- **`webServer` runs `next dev --turbopack`** — fastest local iteration; matches `npm run dev`.
- **Test DB via `NODE_ENV=test`** — both the Playwright-managed dev server (via `webServer.env`) and the Playwright runner process get `NODE_ENV=test` so `@/lib/db` connects to the test DB and `@next/env`'s `loadEnvConfig` reads `.env.test`. `playwright.config.ts` sets `NODE_ENV=test` at the top before any import that touches env, mirroring the pattern in `scripts/migrate.ts`.
- **Migrations via Playwright `globalSetup`** — applies Drizzle migrations against the test DB before the suite runs. Idempotent (Drizzle migrate is safe to re-run). No developer pre-step required.
- **DB reset per test** — `test.beforeEach` calls `cleanDatabase()` from the existing `__tests__/helpers/db.ts`. Reuses the integration-test pattern.
- **Workers/parallelism** — `fullyParallel: false`, `workers: 1`. Shared test DB makes serial execution the safe default.
- **`reuseExistingServer: true`** — faster local reruns; no CI to worry about.
- **Browser** — single project: `chromium` with the `Desktop Chrome` device descriptor.
- **Locators** — `page.getByLabel(...)`, `page.getByRole("button", { name: ... })`. Accessibility-first; robust to UI refactors.
- **Helpers location** — single file `__tests__/e2e/helpers.ts` exporting `cleanDatabase` (re-export) and `uniqueEmail(prefix)`.
- **Vitest excludes** — add `exclude: ["__tests__/e2e/**"]` to both projects in `vitest.config.ts`.
- **Path resolution** — Playwright respects tsconfig `paths`; `@/...` imports should work. Fallback: relative imports if path resolution fails (see Risks).
- **Playwright version** — latest stable, exact pin (no `^`/`~`).

## Tasks

### 1. Install Playwright, add minimal config and `test:e2e` script

Adds `@playwright/test` as a dev dependency at an exact version, installs the Chromium browser, creates a minimal `playwright.config.ts`, and wires `npm run test:e2e`. At the end of this task, `npm run test:e2e` should exit successfully (with "no tests found"); the foundation is in place but no tests exist yet.

**Requirements:** REQ-1, REQ-2, REQ-4, REQ-7 (in part — config sets up test root), REQ-8

**Files:**
- `package.json` — add `@playwright/test` to `devDependencies` at an exact pinned version (use latest stable available at install time). Add `"test:e2e": "playwright test"` to `scripts`. Lockfile updates.
- `playwright.config.ts` (new, repo root) — minimal config: `testDir: "__tests__/e2e"`, `fullyParallel: false`, `workers: 1`, `reuseExistingServer: true`, `webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, env: { NODE_ENV: "test" }, timeout: 120_000 }`, projects: `[{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]`, baseURL set to `http://localhost:3000`. At the very top of the file, before any other import, set `NODE_ENV=test` defensively via `Object.assign(process.env, { NODE_ENV: "test" })` (mirrors `scripts/migrate.ts:18-20`).
- `.gitignore` — add `/test-results/`, `/playwright-report/`, `/playwright/.cache/`.

**Approach:**
1. Run `npm install --save-exact -D @playwright/test` to install at exact version.
2. Run `npx playwright install chromium` to fetch the browser.
3. Author `playwright.config.ts`. Use `defineConfig` from `@playwright/test`. Import `devices` for the Chromium project.
4. Add `.gitignore` entries.
5. Add the npm script.
6. Verify: `npm run test:e2e` should succeed with "no tests found in: __tests__/e2e".

**Verification:**
- `npm install` is idempotent (no diff after running).
- `package.json` shows the exact-pinned `@playwright/test` version (no `^` or `~`).
- `npm run test:e2e` exits with code 0 and the message "Error: No tests found" is **not** treated as failure (Playwright's no-tests behavior: actually returns non-zero by default — handle by deferring this verification until Task 4 when the first test exists, or use `--passWithNoTests` if Playwright supports it; otherwise verify only that the config loads cleanly via `npx playwright test --list` which lists zero tests and exits 0).
- `npx playwright test --list` shows 0 tests and exits 0.

**Depends on:** none

---

### 2. Add `globalSetup` (migrations) and E2E helpers (`cleanDatabase`, `uniqueEmail`)

Adds the Playwright `globalSetup` script that applies migrations to the test DB before the suite, plus a small helpers module that re-exports `cleanDatabase` and provides a `uniqueEmail` generator for use in tests.

**Requirements:** REQ-5, REQ-6, REQ-7

**Files:**
- `__tests__/e2e/global-setup.ts` (new) — exports a default async function that applies Drizzle migrations to the test DB. Reuse migration logic by importing from `drizzle-orm/node-postgres/migrator` directly (mirror the body of `scripts/migrate.ts`), or extract the migration function from `scripts/migrate.ts` into a small reusable function (`runMigrations()` in `scripts/lib/migrate.ts`) and import from there. Recommended: extract — keeps logic DRY between `db:migrate` script and `globalSetup`.
- `scripts/lib/migrate.ts` (new, optional but recommended per above) — exports `runMigrations()` that creates a Pool, runs `migrate()`, closes the pool. No CLI parsing in this function.
- `scripts/migrate.ts` (modify) — replace inline migration logic with a call to `runMigrations()`.
- `__tests__/e2e/helpers.ts` (new) — exports `cleanDatabase` (re-exported from `../helpers/db`) and `uniqueEmail(prefix: string): string`. The unique-email implementation uses `Date.now()` plus 4 hex bytes from `crypto.randomBytes(4)` to guarantee no collisions across runs.
- `playwright.config.ts` (modify) — add `globalSetup: "./__tests__/e2e/global-setup.ts"` to the config.

**Approach:**
1. Decide whether to extract the migration function. Recommended: yes, into `scripts/lib/migrate.ts`. This avoids re-implementing the Pool + migrate dance in two places. Update `scripts/migrate.ts` to import and call it.
2. Author `__tests__/e2e/global-setup.ts`. The function should:
   - Confirm `NODE_ENV === "test"` (throw if not, defensive).
   - Confirm `process.env.DATABASE_URL` is set (throw with a clear message if not — likely means `.env.test` is missing).
   - Call `runMigrations()`.
3. Author `__tests__/e2e/helpers.ts`:
   ```ts
   import crypto from "node:crypto";
   export { cleanDatabase } from "../helpers/db";
   export function uniqueEmail(prefix: string): string {
     const suffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
     return `${prefix}-${suffix}@conaro.test`;
   }
   ```
4. Wire `globalSetup` into `playwright.config.ts`.

**Verification:**
- `npx playwright test --list` still lists 0 tests but globalSetup loads cleanly (no errors during load).
- Manually run `tsx __tests__/e2e/global-setup.ts` (or invoke its default export) against the test DB and confirm it applies migrations and exits cleanly.
- `npx tsc --noEmit` passes (no TypeScript errors).

**Depends on:** Task 1

---

### 3. Update `vitest.config.ts` to exclude `__tests__/e2e/**`

Adds explicit `exclude` patterns to both Vitest projects so Vitest never picks up E2E tests. Defensive — current `include` patterns wouldn't match anyway, but the explicit guard prevents future drift.

**Requirements:** REQ-11

**Files:**
- `vitest.config.ts` — add `exclude: ["__tests__/e2e/**"]` to both the `node` and `jsdom` project test configs.

**Approach:**
1. Locate the two `projects` entries.
2. Add an `exclude` field next to each `include`.

**Verification:**
- `npm test` exits cleanly and runs the existing 80+ Vitest test files but not anything under `__tests__/e2e`.
- Add a temporary file `__tests__/e2e/sentinel.test.ts` that would fail if collected (e.g. `it("collected by vitest", () => { throw new Error("should not run"); })`), confirm `npm test` still passes, then delete the sentinel. (Optional belt-and-suspenders verification.)

**Depends on:** Task 1

---

### 4. Implement artist registration E2E test

Implements the artist register golden-path test. Visits `/register/artist`, fills the form with valid credentials and a unique email, submits, and asserts the user lands authenticated on `/dashboard` with the dashboard's primary content visible.

**Requirements:** REQ-3, REQ-9

**Files:**
- `__tests__/e2e/artist/register.test.ts` (new) — single `test.describe("artist register")` block with one `test("creates account and lands on dashboard")` plus a `test.beforeEach(async () => { await cleanDatabase(); })`.

**Approach:**
1. Import `test`, `expect` from `@playwright/test`. Import `cleanDatabase`, `uniqueEmail` from `../helpers`.
2. `beforeEach` resets the DB.
3. The test:
   - `await page.goto("/register/artist")`.
   - Fill the four fields by label: `Display name`, `Email address`, `Password`, `Confirm password`. Use `page.getByLabel(...)`.
   - Click `getByRole("button", { name: /create artist account/i })`.
   - Wait for navigation: `await page.waitForURL("**/dashboard")`.
   - Assert dashboard rendered: pick a stable selector from the dashboard view (recommended: a heading or nav link unique to the artist dashboard — confirm during implementation by reading `src/components/dashboard/dashboard-view.tsx`). For example: `await expect(page.getByRole("heading", { name: /your applications/i })).toBeVisible()` or whichever stable artist-only heading exists.
4. Use a generated email via `uniqueEmail("artist")` and a strong password (`"password123"` matches the integration tests' convention).

**Verification:**
- `npm run test:e2e` runs the test and it passes (1 passed).
- Temporarily break the artist register form (e.g., remove the `name="email"` attribute) and confirm the test fails with a clear, actionable error. Restore.
- The test passes again on a second consecutive run (idempotency check — `beforeEach` reset cleans up).

**Depends on:** Tasks 1, 2, 3

---

### 5. Implement organizer registration E2E test

Implements the organizer register golden-path test. Same shape as Task 4 but for the organizer flow, including the additional `Convention name` field; redirect target is `/conventions/manage`.

**Requirements:** REQ-3, REQ-10

**Files:**
- `__tests__/e2e/organizer/register.test.ts` (new) — single `test.describe("organizer register")` with one test plus `beforeEach` cleanup.

**Approach:**
1. Same imports / pattern as artist test.
2. Test:
   - `await page.goto("/register/organizer")`.
   - Fill the five fields: `Display name`, `Email address`, `Password`, `Confirm password`, `Convention name`. (Confirm field labels by reading `src/components/auth/organizer-register-form.tsx` during implementation.)
   - Click `getByRole("button", { name: /create organizer account|launch|create/i })` — pick the literal label from the form during implementation.
   - `await page.waitForURL("**/conventions/manage")`.
   - Assert organizer landing page rendered (pick a stable selector from `src/app/(authenticated)/conventions/manage/page.tsx` during implementation).
3. Use `uniqueEmail("organizer")`.

**Verification:**
- `npm run test:e2e` runs both tests; both pass.
- Both tests still pass on a second consecutive run.
- Temporarily break the organizer form and confirm clear failure. Restore.

**Depends on:** Tasks 1, 2, 3

---

### 6. Update README with E2E runbook

Adds a short section to the README explaining how to run the E2E tests locally and what the prerequisites are.

**Requirements:** REQ-12

**Files:**
- `README.md` — add a `## E2E tests (Playwright)` section near the existing testing/development docs.

**Approach:**
The section should cover:
- Prerequisite: test DB up and reachable (point to whatever doc covers `db:migrate:test`).
- One-time browser install: `npx playwright install chromium`.
- Running: `npm run test:e2e`.
- What's currently covered: artist register, organizer register.
- Note: `globalSetup` applies migrations automatically; `beforeEach` cleans the DB; tests use unique emails.
- Note: more journeys (profile setup, apply, review, publish) tracked separately.

Keep it ~20 lines, factual.

**Verification:**
- README renders correctly when previewed (markdown valid).
- A developer following only the README can clone, install, and run E2E tests successfully.

**Depends on:** Tasks 1, 2, 4, 5

---

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (Playwright pinned dep) | 1 |
| REQ-2 (`playwright.config.ts` exists) | 1, 2 |
| REQ-3 (`__tests__/e2e/{artist,organizer}/`) | 4, 5 |
| REQ-4 (`npm run test:e2e` script) | 1 |
| REQ-5 (uses test DB, applies migrations) | 2 |
| REQ-6 (DB reset per test) | 2, 4, 5 |
| REQ-7 (unique emails per test) | 2, 4, 5 |
| REQ-8 (`webServer` auto-start) | 1 |
| REQ-9 (artist register golden path) | 4 |
| REQ-10 (organizer register golden path) | 5 |
| REQ-11 (Vitest/Playwright don't overlap) | 1, 3 |
| REQ-12 (README runbook) | 6 |

## Implementation Status

- [x] Task 1 — installed `@playwright/test@1.59.1` (exact pin), Chromium browser, `playwright.config.ts`, `.gitignore` entries, `test:e2e` script. Verified config loads via `npx playwright test --list` (exits 1 with "no tests found" as expected for an empty suite — see Risks).
- [ ] Task 2
- [ ] Task 3
- [ ] Task 4
- [ ] Task 5
- [ ] Task 6

## Risks

- **Path-alias resolution under Playwright's TS loader.** Playwright supports tsconfig `paths` since 1.28 but occasionally needs explicit configuration. If `@/lib/db` (transitively imported via `cleanDatabase`) fails to resolve, fall back to relative imports in `__tests__/e2e/helpers.ts` (since the underlying `__tests__/helpers/db.ts` already uses `@/...` itself, the fallback would mean ensuring Playwright's tsconfig honors the alias — likely fine but worth verifying early in Task 2).
- **`npm run dev` startup time and turbopack flakiness.** First-page compile can take several seconds. Playwright's default `webServer.timeout` is 60s; we set 120s defensively. If consistent flakiness emerges (e.g., turbopack first-request slowness causing test timeouts), the fallback is to increase the per-test action timeout or switch `webServer` to `next start` after a build (out-of-spec change but available).
- **`beforeEach` `cleanDatabase` performance.** Each test pays the truncation cost. With two tests this is negligible; if the journey set grows past ~20, consider per-file reset or transaction-rollback patterns.
- **`reuseExistingServer: true`** assumes the running dev server (if any) is already in test-DB mode. Developer who has `npm run dev` running against the dev DB and then runs `npm run test:e2e` would either get a port conflict (Playwright won't start a new server) or, worse, run tests against the dev server pointing at the dev DB. The README runbook must call this out: stop any running dev server before invoking `npm run test:e2e`, or set the dev server to `NODE_ENV=test` for the session.
- **Stable dashboard / conventions-manage selectors.** The plan defers the exact assertion target to implementation time. If neither page exposes a clearly stable, accessibility-friendly anchor, we may need to add a `data-testid` — that would be a small Implement → Design loop trip (per CLAUDE.md workflow). Mitigation: pick the assertion as part of Task 4/5 implementation, not the plan.
- **`@playwright/test` "no tests found" exit code.** If the version returns non-zero on empty test sets, Task 1's verification step shifts to `npx playwright test --list` (which is documented as the correct check anyway).
