# Implementation Plan: Railway Deployment Plumbing

Spec: `.claude/plans/railway-deployment-plumbing-spec.md`

## Technical Decisions

- **DB SSL handling**: No code change to `src/lib/db/index.ts`. Rely on `?sslmode=require` in the Railway-provided `DATABASE_URL` (Railway's Postgres plugin includes this in its auto-generated URL). Local docker-compose URL has no `sslmode` query param → `pg` connects without SSL. Document the requirement in `.env.example` and the deploy guide. Rationale: avoids env-detection logic in code; the `pg` library already parses `sslmode` from the connection string; local and Railway both work without runtime branching.

- **Env loading via `@next/env`**: Use Next.js's official `loadEnvConfig(process.cwd())` from the `@next/env` package in non-Next contexts (`drizzle.config.ts`, scripts, vitest setup). This loads `.env*` files in the same precedence Next.js itself uses (`.env.{environment}.local` → `.env.local` → `.env.{environment}` → `.env`), respects `NODE_ENV`, and never overrides `process.env` (so Railway-provided vars always win). No direnv, no `dotenv` devDep. Drizzle's docs recommend this exact pattern for `drizzle.config.ts`.

- **Migration runner**: New `scripts/migrate.ts` using `drizzle-orm/node-postgres/migrator` against `./src/lib/db/migrations`. Accepts a `--test` flag that sets `process.env.NODE_ENV = "test"` before calling `loadEnvConfig`, making it load `.env.test` instead of `.env.local`. Used as Railway's release-phase command (`npm run db:migrate`). Rationale: programmatic migrator runs on production deps only (no devDep dependency on `drizzle-kit`); idempotent via the journal table; clean exit codes for Railway to gate deploy on.

- **NPM scripts**: All `db:*`, `test`, `test:watch` scripts drop the `--env-file` flag. `db:migrate` switches from `drizzle-kit migrate` to the programmatic runner. `db:migrate:test` reuses the same runner with `--test`. drizzle-kit-only scripts (`db:generate`, `db:studio`) work locally because `drizzle.config.ts` calls `loadEnvConfig` at the top.

- **Auth.js production wiring**: No code change. Auth.js v5 reads `AUTH_SECRET` and `AUTH_TRUST_HOST` (or `AUTH_URL`) directly from `process.env`. `.env.example` documents both. Behind Railway's proxy, `AUTH_TRUST_HOST=true` is sufficient and is simpler than maintaining `AUTH_URL`.

- **Railway config**: Single `railway.json` at repo root specifying NIXPACKS builder, `deploy.preDeployCommand = "npm run db:migrate"` (release-phase), `deploy.startCommand = "npm run start"`. Implementation will verify the exact current Railway schema fields (e.g. `preDeployCommand` vs `predeploys` array) via WebFetch to docs.railway.com when authoring.

- **Node version pin**: Add `"engines": { "node": ">=20.10.0" }` to `package.json` so Nixpacks selects deterministically. No separate `.nvmrc` needed.

- **Documentation**: Create `README.md` at repo root (none exists). Sections: project blurb, local dev setup (docker-compose + db:migrate + db:seed), tests, Railway deploy guide, cron-job.org setup for `/api/cron/events/tick`.

## Tasks

### 1. Programmatic env loading via `@next/env` ✅

Wire `loadEnvConfig` into every entry point that runs outside Next.js (drizzle config, scripts, vitest setup) so dropping `--env-file` in a later task doesn't break local workflows. Safe additive change — `loadEnvConfig` doesn't override `process.env`, so existing `--env-file` scripts continue to work.

**Status:** Completed. `@next/env` pinned to 16.2.3 (matches `next`). `scripts/lib/env.ts` bootstrap added; `drizzle.config.ts` and `__tests__/setup.ts` prepend `loadEnvConfig`. Seed scripts updated: `seed-reset`, `seed-conventions`, `seed-artists`, `seed-apply`, `seed-event`, `seed-selection`. (`seed-applications.ts` is in untracked in-flight work and was excluded from the T1 commit; the import line is on disk and will be picked up when that file is committed by its owning feature.) `npm test` passes (567/567).

**Requirements:** REQ-3 (foundation), REQ-2 (foundation)

**Files:**
- `package.json` — add `@next/env` to `dependencies` (already a transitive dep of `next`; pin explicitly so it can't tree-shake away).
- `scripts/lib/env.ts` — new module with side-effect import: `import { loadEnvConfig } from "@next/env"; loadEnvConfig(process.cwd());`. Resolves `.env*` from project root.
- `drizzle.config.ts` — prepend `import { loadEnvConfig } from "@next/env"; loadEnvConfig(process.cwd());` before `defineConfig`.
- `__tests__/setup.ts` — prepend the same `loadEnvConfig` call as the very first statement (before the existing `@testing-library/jest-dom/vitest` import). Vitest sets `NODE_ENV=test` before setupFiles run, so `.env.test` is loaded.
- `scripts/seed-reset.ts`, `scripts/seed-conventions.ts`, `scripts/seed-artists.ts`, `scripts/seed-applications.ts`, `scripts/seed-apply.ts`, `scripts/seed-event.ts`, `scripts/seed-selection.ts` — add `import "./lib/env";` as the very first import, before the `db` import (because `db` reads `process.env.DATABASE_URL` at module load).

**Approach:**
- Install: `npm install @next/env` (production dep).
- `scripts/lib/env.ts` is intentionally minimal — a side-effect-only module so consumers just write `import "./lib/env";` and don't have to call a function.
- For `drizzle.config.ts`, the `loadEnvConfig` call must come before `defineConfig` because `dbCredentials.url` reads `process.env.DATABASE_URL` at module evaluation.
- For test setup: `loadEnvConfig` returns silently if files are missing (Railway doesn't have `.env.test`), so this is also safe to ship to production.

**Verification:**
- `npm test` passes (existing `--env-file .env.test` still loads vars; `loadEnvConfig` is a no-op because `process.env` already populated).
- `npm run db:migrate` still works locally (existing `--env-file .env.local` flag still in package.json).
- `npx tsx scripts/seed-reset.ts` works without `--env-file` if `.env.local` is present at project root (proves the new bootstrap works in isolation).

**Depends on:** none

---

### 2. Programmatic migration runner

Add the migration script that will be used both locally (`npm run db:migrate`) and as Railway's pre-deploy command. Doesn't replace anything yet — additive.

**Requirements:** REQ-2

**Files:**
- `scripts/migrate.ts` — new file. Structure:
  - `import "./lib/env";` (default — loads `.env.local` if `NODE_ENV` not `test`).
  - Parse `process.argv` for `--test`. If present, set `process.env.NODE_ENV = "test"` BEFORE the env import. Since import order matters, the `--test` handling must be done by re-importing or restructuring: simplest is to put the NODE_ENV mutation at the very top (before ALL imports) using a conditional require, or split into a thin wrapper. **Cleaner alternative**: don't use `./lib/env`; inline the loadEnvConfig call after parsing `--test`:
    ```
    import { loadEnvConfig } from "@next/env";
    if (process.argv.includes("--test")) process.env.NODE_ENV = "test";
    loadEnvConfig(process.cwd());
    // then import drizzle/pg dynamically OR statically with no env-dependent module load
    ```
  - Validate `process.env.DATABASE_URL` is set; if not, log and exit 1.
  - Create a fresh `pg` `Pool` from `DATABASE_URL` (do NOT import the long-lived app pool from `src/lib/db`).
  - Call `migrate(drizzle(pool), { migrationsFolder: "./src/lib/db/migrations" })`.
  - `await pool.end()`. Exit 0 on success, log error and exit 1 on failure.

**Approach:**
- Use `drizzle-orm/node-postgres/migrator`'s `migrate` function (already a runtime dep via `drizzle-orm`).
- Don't reuse `src/lib/db`'s pool — that pool is designed for long-running app use and isn't `.end()`-friendly for one-shot scripts.
- The script is ~30 lines total.
- For the `--test` flag ordering issue: since `loadEnvConfig` doesn't override `process.env`, and migrator imports don't read env at module-load time, the order `set NODE_ENV → loadEnvConfig → use process.env.DATABASE_URL` is safe even with all-static imports.

**Verification:**
- `npx tsx scripts/migrate.ts` against the local dev DB completes without applying anything (idempotent on already-migrated DB) and exits 0.
- `npx tsx scripts/migrate.ts --test` against the local test DB does the same. Confirm by checking the connection went to `conaro_test` (e.g. add a temp `console.log` of the DB name during verification, then remove).

**Depends on:** Task 1

---

### 3. Drop `--env-file` from npm scripts; switch to programmatic runner

Cut over the script surface to the new env-loading mechanism. After this task, all scripts work both locally (via `loadEnvConfig` reading `.env.local` or `.env.test`) and on Railway (via platform env vars).

**Requirements:** REQ-3, REQ-2

**Files:**
- `package.json` — `scripts` block. Replace:
  - `db:migrate` → `tsx scripts/migrate.ts`
  - `db:migrate:test` → `tsx scripts/migrate.ts --test`
  - `db:studio` → `drizzle-kit studio` (env loaded by `drizzle.config.ts`)
  - `db:seed` → `tsx scripts/seed-selection.ts`
  - `db:seed:artists` → `tsx scripts/seed-artists.ts`
  - `db:seed:conventions` → `tsx scripts/seed-conventions.ts`
  - `db:seed:reset` → `tsx scripts/seed-reset.ts`
  - `db:seed:event` → `tsx scripts/seed-event.ts`
  - `db:seed:apply` → `tsx scripts/seed-apply.ts`
  - `db:seed:applications` → `tsx scripts/seed-applications.ts`
  - `test` → `vitest run`
  - `test:watch` → `vitest`
  - `db:reset-and-seed` unchanged (it just chains other scripts)

**Approach:**
- Pure package.json edit — no other files change.
- Verify nothing references `node --env-file` elsewhere (e.g. CI config, hooks). At time of writing, none exist.

**Verification:**
- `npm test` passes (all suites).
- `npm run db:migrate` against a fresh local DB applies all 23 migrations.
- `npm run db:migrate:test` against `conaro_test` applies migrations.
- `npm run db:seed:reset` runs without crash.
- `npm run dev` boots Next.js and the app loads (Next handles its own env).
- `npm run db:studio` opens drizzle studio against the local dev DB.

**Depends on:** Task 1, Task 2

---

### 4. Add Railway deploy config and Node version pin

The smallest config that gives Railway deterministic build/release/start commands and a fixed Node version. After this task, a Railway service connected to `main` with the right env vars set will build and deploy correctly.

**Requirements:** REQ-2, REQ-7 (partial — doc lives in task 6)

**Files:**
- `railway.json` — new file at repo root. Concrete schema fields verified during implementation by fetching `https://docs.railway.com/reference/config-as-code` (exact JSON schema URL noted in the resulting file's `$schema` key). Expected shape:
  ```json
  {
    "$schema": "https://railway.com/railway.schema.json",
    "build": { "builder": "NIXPACKS" },
    "deploy": {
      "preDeployCommand": "npm run db:migrate",
      "startCommand": "npm run start",
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  }
  ```
- `package.json` — add `"engines": { "node": ">=20.10.0" }` at the top level.

**Approach:**
- Implementation step: WebFetch Railway's current config-as-code docs to confirm field names (`preDeployCommand` vs alternatives have been renamed before).
- Don't include a `buildCommand` override; Nixpacks auto-detects Next.js and runs `npm run build`.
- The `restartPolicy` fields are belt-and-suspenders — restart up to 3 times on failure rather than crash-loop forever.

**Verification:**
- `railway.json` parses as valid JSON.
- `package.json` engines field is in correct form: `npm install` doesn't warn about it.
- (Deferred to manual smoke test in workflow step 5: actual Railway deploy applies migrations and starts the app.)

**Depends on:** Task 3 (so `npm run db:migrate` is the new programmatic runner before Railway tries to use it)

---

### 5. Update `.env.example`

Document every env var an operator must provide on Railway, with a placeholder and a one-line comment. Also add a comment explaining the local-vs-Railway DATABASE_URL difference (sslmode).

**Requirements:** REQ-6, REQ-1 (documentation), REQ-4 (documentation)

**Files:**
- `.env.example` — full rewrite (it's only 170 bytes today, and likely needs new entries anyway).

**Approach:**
- Sections (in this order):
  1. **Database** — `DATABASE_URL`. Comment notes: local example (`postgresql://postgres:postgres@localhost:5433/conaro_dev`), production must include `?sslmode=require` (Railway provides this by default).
  2. **Auth.js** — `AUTH_SECRET` (note: `openssl rand -base64 32`), `AUTH_TRUST_HOST=true` (note: required behind any HTTPS reverse proxy).
  3. **Cron** — `CRON_SECRET` (any random string; rotate periodically).
- Keep the existing format conventions if any (single-line comments above each var, blank line between sections).

**Verification:**
- File exists, parses as a `KEY=VALUE` env file (no quoting issues).
- Every var read by application code (`DATABASE_URL`, `CRON_SECRET`) is present.
- Every var Auth.js v5 needs implicitly (`AUTH_SECRET`, `AUTH_TRUST_HOST`) is present.
- Comments are intelligible to someone who hasn't seen the codebase.

**Depends on:** none (can be done in parallel with tasks 1-4, but commit sequencing keeps it after 4 for narrative clarity)

---

### 6. Create `README.md` with deploy guide

The single piece of operator-facing documentation. Walks a reader from "fresh clone" to "deployed on Railway with cron firing." Includes the cron-job.org setup the spec calls for.

**Requirements:** REQ-7, REQ-5 (cron documentation), REQ-1 (SSL documentation)

**Files:**
- `README.md` — new file at repo root.

**Approach:**
- Sections:
  1. **Conaro** — one-paragraph project blurb (artists apply for convention stands).
  2. **Tech stack** — bullet list (Next 16, TypeScript, Drizzle, Postgres, Auth.js v5, Tailwind, shadcn).
  3. **Local development** — prerequisites (Node ≥20.10, Docker), step-by-step:
     - `cp .env.example .env.local` and fill values
     - `docker-compose up -d`
     - `npm install`
     - `npm run db:migrate`
     - `npm run db:seed:reset && npm run db:seed:conventions && npm run db:seed:artists -- --with-portfolios 100`
     - `npm run dev`
  4. **Tests** — `npm run db:migrate:test` then `npm test`.
  5. **Deployment (Railway)** — step-by-step:
     - Create Railway project, add Postgres plugin (note: Railway's auto-generated `DATABASE_URL` includes `?sslmode=require`).
     - Connect the GitHub repo as a service.
     - Set env vars in Railway dashboard: `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_TRUST_HOST=true`, `CRON_SECRET` (random string). `DATABASE_URL` is auto-set by the Postgres plugin.
     - Trigger deploy. Confirm `npm run db:migrate` runs in the deploy logs as the pre-deploy step before the app starts.
     - Sanity-check the deployed homepage URL.
  6. **Cron setup (cron-job.org)** — step-by-step:
     - Create a cron-job.org account.
     - Add a job: `GET https://<your-app>.up.railway.app/api/cron/events/tick`.
     - Headers: `Authorization: Bearer <CRON_SECRET>`.
     - Schedule: hourly (or chosen cadence; the endpoint is idempotent).
     - Confirm successful runs by tailing Railway logs.
  7. **Known limitations** — uploads ephemeral, emails only logged. Link to spec(s) for R2 / Resend follow-up work.

**Approach:**
- Follow GitHub-flavored markdown conventions (fenced code blocks, headers, ordered lists for procedures).
- Don't pad — keep it under ~150 lines.

**Verification:**
- File renders correctly on GitHub (preview locally with a markdown viewer).
- All commands referenced in the doc actually exist in `package.json` after task 3.
- An operator following the doc can stand up a fresh Railway service. (Verified during workflow step 5 manual testing.)

**Depends on:** Tasks 3, 4, 5 (so the doc can reference the actual final scripts/config/env-vars)

---

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (DB SSL works on Railway and local) | 5 (`.env.example` doc), 6 (deploy doc) |
| REQ-2 (migrations apply on every deploy) | 2 (runner), 3 (script wired up), 4 (Railway predeploy) |
| REQ-3 (no `--env-file`, scripts work both envs) | 1 (env loading), 2 (runner uses it), 3 (scripts updated) |
| REQ-4 (Auth.js works behind proxy) | 5 (`.env.example` documents `AUTH_SECRET`, `AUTH_TRUST_HOST`) |
| REQ-5 (cron endpoint reachable on schedule) | 5 (`CRON_SECRET` documented), 6 (cron-job.org setup) |
| REQ-6 (`.env.example` complete) | 5 |
| REQ-7 (operator deploy doc) | 4 (config), 6 (README) |
| REQ-8 (smoke test passes) | All — verified manually in workflow step 5 |

## Risks

- **Railway's `railway.json` schema can change.** Field names like `preDeployCommand` have been renamed before. Mitigation: implementation phase fetches Railway's current docs and confirms the field names before writing the file.
- **`@next/env` API stability.** It's a public Next package but tied to Next major versions. Mitigation: explicitly add it to `dependencies` (not just transitive), pin Next version (already pinned to `16.2.3`), and revisit on Next upgrades.
- **Vitest worker isolation with env loading.** Vitest runs `setupFiles` before each test file's imports, so `loadEnvConfig` should run first. Risk if vitest's behavior changes — mitigation: a smoke check during task 1 verification (run a single test that asserts `process.env.DATABASE_URL` matches the test DB).
- **Nixpacks Node version detection.** `engines.node` should suffice but Nixpacks has been quirky about pre-release Node ranges. Mitigation: pin a stable LTS range (`>=20.10.0`); add `.node-version` if Railway's deploy log shows the wrong version picked up.
- **Drizzle-kit programmatic migrator parity.** The existing `drizzle-kit migrate` CLI and the `drizzle-orm/node-postgres/migrator` library both consume the same journal + SQL files, so they produce identical results. Mitigation: task 2 verification runs the new migrator against an already-migrated DB and against a fresh DB to prove parity.
- **`db:migrate:test` ordering of `NODE_ENV` mutation vs `loadEnvConfig`.** The migrate script must set `NODE_ENV=test` *before* `loadEnvConfig` runs. Static imports execute in source order, so as long as the `loadEnvConfig` import and the `NODE_ENV` mutation are sequenced correctly at the top of `scripts/migrate.ts`, this works. Mitigation: explicit verification step in task 2 confirms `--test` connects to `conaro_test`.
- **Operator-required actions outside the codebase.** This spec produces config + docs; the user must (a) create the Railway service, (b) install the Postgres plugin, (c) set env vars, (d) sign up for cron-job.org. None of this can be automated from the repo per `.claude/rules/safety.md`.
