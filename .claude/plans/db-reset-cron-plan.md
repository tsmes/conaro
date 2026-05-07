# Implementation Plan: 24h Demo Database Reset Cron Endpoint

Spec: `.claude/plans/db-reset-cron-spec.md`
Issue: #18

## Technical Decisions

- **Route location**: `src/app/api/cron/db-reset/route.ts` — mirrors the `events/tick` cron route, keeps all cron endpoints under one path.
- **Bearer auth helper**: Extract `secureCompare` from the inline definition in `events/tick/route.ts` to `src/lib/auth/secure-compare.ts`. Two consumers now is a fair threshold to consolidate.
- **Seed refactor shape**: Each `scripts/seed-*.ts` (reset, conventions, artists, applications) gains a typed named export `runX(opts)`. The existing CLI invocation block (`run().then(...).catch(...)`) at the bottom of each file is preserved and now calls the new exported function. Smallest diff; CLI behavior unchanged.
- **Asset path resolution**: Change `path.resolve(__dirname, "..", "seed-assets", ...)` in `scripts/lib/conventions-manifest.ts` and `scripts/lib/portfolio-manifest.ts` to `path.resolve(process.cwd(), "scripts/seed-assets", ...)`. Works for both CLI invocation (`tsx` runs from repo root, so `cwd === repo root`) and Next.js route handlers on Railway (where `process.cwd()` is the repo root and `scripts/` survives in the runtime image because we are not using `output: 'standalone'`).
- **Async 202 response**: Route runs auth + guard checks, returns `202 Accepted`, then continues the seed work in the background via `void runReset().catch(logError)` after the response is sent. Standard fire-and-forget on a long-running Node process; no `waitUntil` primitive needed.
- **`writeCredentialsFile` side effect** in `seed-conventions.ts`: make opt-in via an options field. CLI passes `true` (preserves current behavior); route handler passes `false` (or omits it).
- **Test scope**: Auth + dispatch only. Mock the four `runX` functions with `vi.mock`, assert they were called in order on the success path. End-to-end run is validated manually on the demo Railway service.
- **Logging**: Use `console.log` for phase start / end and `console.error` for failures, including the failing phase name. Matches the existing tick route's logging style and is sufficient for Railway log inspection.

## Tasks

### 1. Extract `secureCompare` to a shared util

**Requirements:** REQ-2 (infrastructure prerequisite for the new route)

**Files:**
- `src/lib/auth/secure-compare.ts` — new file. Export `secureCompare(a: string, b: string): boolean` using `crypto.timingSafeEqual` with a length pre-check (verbatim copy of the inline helper at `src/app/api/cron/events/tick/route.ts:10-15`).
- `src/app/api/cron/events/tick/route.ts` — remove the inline `secureCompare` function and the `import { timingSafeEqual } from "crypto"` line; add `import { secureCompare } from "@/lib/auth/secure-compare"`.

**Approach:**
- Move the existing helper as-is. Do not change its signature or semantics.
- Confirm no other files reference the inline helper (investigation showed there is none).

**Verification:**
- `npm run lint` clean.
- `npm test -- event-cron` passes — the existing tick-route tests exercise this path through the route handler.

**Depends on:** none

---

### 2. Refactor manifest loaders to use `process.cwd()`

**Requirements:** Infrastructure (enables tasks 4 and 5–6 to run inside a Next.js route handler).

**Files:**
- `scripts/lib/conventions-manifest.ts` — replace `path.resolve(__dirname, "..", "seed-assets", "conventions", ...)` with `path.resolve(process.cwd(), "scripts/seed-assets/conventions", ...)`. Affects `loadConventionManifests`, `resolveAssetPath`, `resolveGuestPhotoPath` (any function in this file that constructs paths from `__dirname`).
- `scripts/lib/portfolio-manifest.ts` — same change for the portfolios path: `path.resolve(process.cwd(), "scripts/seed-assets/portfolios", ...)`. Affects `loadPortfolioPool`, `resolvePortfolioImagePath`.

**Approach:**
- Read both files, identify every `__dirname` usage, replace with `process.cwd()`-based paths.
- Do not change the function signatures.

**Verification:**
- Manually run `npm run db:seed:reset && npm run db:seed:conventions && npm run db:seed:artists -- --with-portfolios 5` against the local dev DB. Confirm conventions, organizers, and a small portfolio set are seeded without "no such file" errors. (Five artists keeps the manual-test runtime under a minute.)
- `npm run lint` clean.

**Depends on:** none

---

### 3. Extract `runResetSeedData()` from `seed-reset.ts`

**Requirements:** REQ-1, REQ-6 (infrastructure for the route's reset phase)

**Files:**
- `scripts/seed-reset.ts` — refactor: hoist the body of `async function run()` into an exported `export async function runResetSeedData(opts?: { logger?: (msg: string) => void }): Promise<{ deleted: number; total: number; emails: string[] }>`. The existing `run()` block at the bottom becomes a thin wrapper: `runResetSeedData({ logger: console.log }).then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); })`.

**Approach:**
- Replace direct `console.log` calls inside the function body with `(opts?.logger ?? (() => {}))(msg)`.
- Return aggregate counts (`deleted`, `total`, list of deleted emails) so the route handler can include them in success-path logging.
- Keep `import "./lib/env"` at the top (no-op in the Next.js runtime, harmless when imported by the route).

**Verification:**
- `npm run db:seed:reset` against the local dev DB still works and prints the same lines.
- `npm run lint` and `npm run build` clean — confirms the file is type-correct as a module.

**Depends on:** none

---

### 4. Extract `runSeedConventions()` from `seed-conventions.ts`

**Requirements:** REQ-1, REQ-6

**Files:**
- `scripts/seed-conventions.ts` — refactor: hoist `run()` into `export async function runSeedConventions(opts?: { logger?: (msg: string) => void; writeCredentialsFile?: boolean }): Promise<{ manifests: number; conventionsCreated: number; eventsUpserted: number; assetsUploaded: number; guestsSeeded: number; programmeItemsSeeded: number }>`. Default `writeCredentialsFile` to `false`. Existing CLI runner at file bottom calls the new function with `{ logger: console.log, writeCredentialsFile: true }`.

**Approach:**
- The credentials-file write currently uses `__dirname`. Keep that path unchanged (it only runs in CLI context where `__dirname` is correct).
- Replace `console.log` calls with the injected logger.
- Aggregate the counts as the function runs and return them.

**Verification:**
- `npm run db:seed:conventions` against the local dev DB still works.
- `scripts/seed-credentials.md` is regenerated by the CLI run (proves `writeCredentialsFile: true` still writes correctly).
- `npm run lint` and `npm run build` clean.

**Depends on:** task 2 (manifest loader path change)

---

### 5. Extract `runSeedArtists()` from `seed-artists.ts`

**Requirements:** REQ-1, REQ-6

**Files:**
- `scripts/seed-artists.ts` — refactor: hoist `run()` into `export async function runSeedArtists(opts: { count?: number; withPortfolios?: boolean; logger?: (msg: string) => void }): Promise<{ total: number; created: number; existing: number; portfoliosSeeded: number; imagesUploaded: number }>`. Default `count = 50`, `withPortfolios = false`. The existing CLI runner now calls `parseArgs()` to get `{ count, withPortfolios }` and forwards them to `runSeedArtists({ count, withPortfolios, logger: console.log })`.

**Approach:**
- Keep `parseArgs()` as-is (only used by the CLI block).
- Replace `console.log` calls inside the function body with the injected logger.
- Aggregate counts and return them.

**Verification:**
- `npm run db:seed:artists -- --with-portfolios 5` works.
- `npm run db:seed:artists` (no flags, defaults to 50) works.
- `npm run lint` and `npm run build` clean.

**Depends on:** task 2

---

### 6. Extract `runSeedApplications()` from `seed-applications.ts`

**Requirements:** REQ-1, REQ-6

**Files:**
- `scripts/seed-applications.ts` — refactor: hoist `run()` into `export async function runSeedApplications(opts?: { logger?: (msg: string) => void }): Promise<{ eventsSeeded: number; alreadyPresent: number; newlyCreated: number; byStatus: Record<string, number>; imagesCopied: number; artistsCreatedOnTheFly: number }>`. Existing CLI runner at file bottom invokes with `{ logger: console.log }`.

**Approach:**
- Keep the const-block at the top of the file (`STATUS_WEIGHTS`, `PINNED_PROBABILITY`, `DEFAULT_COUNT_RANGE`, `COUNT_OVERRIDES`, `SEED_FOR_EVENT_STATUSES`, `ARTIST_INDEX_PROBE_LIMIT`) unparameterized for now — a simple logger-only options object is enough for the spec. Future parameterization can be added if a use case appears.
- Replace `console.log` with the injected logger and accumulate counts.

**Verification:**
- `npm run db:seed:applications` against the local dev DB (after running `db:seed:reset`, `db:seed:conventions`, `db:seed:artists -- --with-portfolios 5`) still produces seeded applications.
- `npm run lint` and `npm run build` clean.

**Depends on:** task 2

---

### 7. Implement the `db-reset` cron route

**Requirements:** REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6

**Files:**
- `src/app/api/cron/db-reset/route.ts` — new file.

**Approach:**

```ts
// pseudo-code shape
import { NextRequest, NextResponse } from "next/server";
import { secureCompare } from "@/lib/auth/secure-compare";
import { runResetSeedData } from "../../../../../scripts/seed-reset";
import { runSeedConventions } from "../../../../../scripts/seed-conventions";
import { runSeedArtists } from "../../../../../scripts/seed-artists";
import { runSeedApplications } from "../../../../../scripts/seed-applications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_RESET_SECRET;
  if (!secret) {
    console.error("CRON_RESET_SECRET not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  if (!secureCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.ENABLE_DB_RESET !== "true") {
    return NextResponse.json({ error: "Disabled" }, { status: 403 });
  }
  void runResetAndSeed();
  return NextResponse.json({ status: "accepted" }, { status: 202 });
}

async function runResetAndSeed() {
  const phases = [
    { name: "reset",        fn: () => runResetSeedData({ logger: console.log }) },
    { name: "conventions",  fn: () => runSeedConventions({ logger: console.log, writeCredentialsFile: false }) },
    { name: "artists",      fn: () => runSeedArtists({ count: 100, withPortfolios: true, logger: console.log }) },
    { name: "applications", fn: () => runSeedApplications({ logger: console.log }) },
  ];
  console.log("[db-reset] start");
  for (const phase of phases) {
    console.log(`[db-reset] phase=${phase.name} starting`);
    try {
      const result = await phase.fn();
      console.log(`[db-reset] phase=${phase.name} done`, result);
    } catch (err) {
      console.error(`[db-reset] phase=${phase.name} failed`, err);
      return;
    }
  }
  console.log("[db-reset] complete");
}
```

- Use `POST` (not `GET`) — better fit for a state-mutating endpoint and matches what cron-job.org will be configured to send.
- The relative `../../../../../scripts/...` import resolves through Next.js's module graph. Confirm `tsconfig.json` `include` covers `scripts/` (the existing tick-route test already imports from `@/app/api/...` which works under the same compile, but cross-into-`scripts` is new — verify the build succeeds and flag if not).

**Verification:**
- `npm run build` succeeds and includes the new route.
- Manual smoke test against local dev:
  - `curl -X POST http://localhost:3000/api/cron/db-reset` → 401.
  - `curl -X POST -H "Authorization: Bearer wrong" http://localhost:3000/api/cron/db-reset` → 401.
  - With `CRON_RESET_SECRET=test` and `ENABLE_DB_RESET` unset: correct bearer → 403.
  - With both env vars set: correct bearer → 202; tail dev-server logs and watch all four phases log their start/done lines; verify the local DB ends up with seeded conventions, artists, applications.

**Depends on:** tasks 1, 3, 4, 5, 6

---

### 8. Tests for the `db-reset` cron route

**Requirements:** Verification of REQ-2, REQ-3, REQ-4, REQ-5

**Files:**
- `__tests__/integration/db-reset-cron.test.ts` — new file. Mirror the structure of `__tests__/integration/event-cron.test.ts`.

**Approach:**
- `vi.mock` the four seed runner modules (`scripts/seed-reset`, `scripts/seed-conventions`, `scripts/seed-artists`, `scripts/seed-applications`) at the top of the test file. Each mock exports the corresponding `runX` as a `vi.fn().mockResolvedValue({ /* shape doesn't matter */ })`.
- `vi.mock("next/cache", ...)` per existing pattern.
- Build a `makeRequest(authHeader?: string): NextRequest` helper for the new path.
- Use `process.env.CRON_RESET_SECRET!` from `.env.test` (add it in task 9 first; see dependency note).
- Cases:
  - 401 — no `Authorization` header.
  - 401 — wrong bearer.
  - 500 — `CRON_RESET_SECRET` unset (mutate `process.env` for the case, restore after).
  - 403 — correct bearer, `ENABLE_DB_RESET` unset (default in `.env.test`).
  - 202 — correct bearer + `ENABLE_DB_RESET=true` (mutate `process.env` for the case). After awaiting the response, also `await new Promise(r => setImmediate(r))` (or similar) to let the fire-and-forget promise settle, then assert each mocked runner was called once and in order via `mock.invocationCallOrder`.

**Verification:**
- `npm test -- db-reset-cron` passes all five cases.
- Existing `event-cron` tests still pass (no regression from task 1's extraction).

**Depends on:** task 7. Task 9 must add `CRON_RESET_SECRET` to `.env.test` before this test can run reliably — schedule task 9 before this task in the commit order.

---

### 9. Docs and env-example updates

**Requirements:** REQ-8

**Files:**
- `.env.example` — add `CRON_RESET_SECRET=` and `ENABLE_DB_RESET=false` with brief inline comments. (User must apply this — file is in the sensitive-files allow-list and Claude cannot read or write it directly. Plan provides the exact lines to add; user pastes them.)
- `.env.test` — add `CRON_RESET_SECRET=test-reset-secret` so tests can read it. (Same constraint as above — user adds.)
- `README.md` — add a "Demo database reset cron" subsection under or beside the existing "Cron setup (events lifecycle)" section. Cover:
  - Required env vars: `CRON_RESET_SECRET`, `ENABLE_DB_RESET=true`.
  - cron-job.org config: URL `/api/cron/db-reset`, method `POST`, header `Authorization: Bearer <CRON_RESET_SECRET>`, schedule once every 24h.
  - Operator note: "Only enable on a dedicated demo service. Setting `ENABLE_DB_RESET=true` on a real production environment will allow the demo data to be wiped on a schedule."
  - Secret rotation: update the env var in Railway, redeploy, update the cron-job.org header.
  - How to confirm a run from Railway logs: search for `[db-reset]` lines.

**Approach:**
- For `.env.example` and `.env.test`: produce the exact text snippets in the plan; ask the user to paste them. Confirm in the commit message which file received which lines.
- For `README.md`: write the new section directly.

**Verification:**
- `cat .env.example | grep CRON_RESET_SECRET` returns the new line (after user applies it).
- `cat .env.test | grep CRON_RESET_SECRET` returns the new line (after user applies it).
- `README.md` renders the new section cleanly when previewed.
- Operator can follow the README from scratch on a fresh Railway service and reach a working scheduled reset.

**Depends on:** none for the README; task 7 conceptually (so we are documenting what exists).

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (HTTP equivalent of `db:reset-and-seed`) | 3, 4, 5, 6, 7 |
| REQ-2 (bearer auth via constant-time compare) | 1, 7 |
| REQ-3 (`ENABLE_DB_RESET` opt-in guard) | 7 |
| REQ-4 (missing `CRON_RESET_SECRET` → server error) | 7 |
| REQ-5 (async 202 contract) | 7 |
| REQ-6 (per-phase logging on failure) | 3, 4, 5, 6, 7 |
| REQ-7 (24h schedule produces 2xx every run) | 7, 9 (verified manually post-deploy) |
| REQ-8 (`.env.example` + README) | 9 |

## Risks

- **`scripts/` cross-imports from a route**: importing `../../../../../scripts/seed-*.ts` into a Next.js route handler is unconventional and depends on `tsconfig.json` `include` covering `scripts/`. If `next build` fails to compile the route because the imports fall outside the `src/` boundary, fall back to relocating the four `runX` exports to a new module under `src/lib/seed/` (re-exporting from `scripts/` for CLI use). Plan can adjust at task 7 if encountered.
- **`process.cwd()` assumption**: Both the manifest loaders (task 2) and the `seed-assets/` survival on Railway depend on `process.cwd() === repo root`. This is true for local `tsx` invocation and for `npm run start` on Railpack today. If anyone later enables Next.js `output: 'standalone'` (e.g., for a slimmer Docker image), `scripts/seed-assets/` will be excluded from the output bundle and the route will fail at runtime. Worth a one-line warning comment in the route handler so future maintainers see the constraint.
- **Fire-and-forget promise lifetime**: If Railway aggressively cycles or restarts the Next.js process between the 202 response and the seeding completion (e.g., on memory pressure during 64 MB of image processing), seeding silently aborts. Acceptable on a dedicated demo with 24h cadence and idempotent seed scripts — the next run cleans up and starts over. Worth noting in the README.
- **Concurrency**: Two overlapping reset runs (e.g., a manual cron-job.org "Run now" while the previous run is still seeding) will race on the same DB. Spec marks this out of scope, but operators should know not to do it. README note.
- **Test env dependency**: Task 8 requires `CRON_RESET_SECRET` in `.env.test`, but `.env*` files are in the user-only allow-list. Task 9 must land before task 8 can run, or the test will skip/fail with an undefined env var. Order: 9 before 8 in the commit sequence.
