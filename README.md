# Conaro

A web platform for artists to apply for convention stands. Artists maintain a
profile and portfolio once; conventions define events with application periods;
applying is one click. Replaces the current process of Google Forms,
spreadsheets, and email.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Drizzle ORM + PostgreSQL
- Auth.js v5 (Credentials provider, JWT sessions)
- Vitest for unit/integration/component tests; Playwright for E2E

## Local development

Prerequisites: Node ≥ 20.10 and Docker.

1. Copy the example env file and fill in the blanks:
   ```bash
   cp .env.example .env.local
   # generate AUTH_SECRET and CRON_SECRET (any random string for the latter):
   openssl rand -base64 32
   ```
2. Start the database:
   ```bash
   docker-compose up -d
   ```
3. Install deps and apply migrations:
   ```bash
   npm install
   npm run db:migrate
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

The app is at <http://localhost:3000>. Individual seed scripts under
`scripts/seed-*.ts` populate conventions, artists, and applications when
needed; see the file headers for usage.

## Tests

```bash
npm run db:migrate:test    # apply schema to the test DB (one-time per change)
npm test                   # run all suites
npm run test:watch         # watch mode
```

Vitest loads `.env.test` automatically via `@next/env`. The test runner skips
`.env.local` so dev secrets never leak into test runs.

## Deployment (Railway)

This project ships with a `railway.json` that gates each deploy on a successful
migration:

- `build.builder = RAILPACK` — Railway's current default builder.
- `deploy.preDeployCommand = npm run db:migrate` — runs against the
  platform-provided `DATABASE_URL` before the app starts. A failed migration
  fails the deploy; the running revision keeps serving traffic.
- `deploy.startCommand = npm run start`.

Steps for a fresh service:

1. Create a Railway project and add the **PostgreSQL** plugin. The plugin
   provisions a `DATABASE_URL` with `?sslmode=require` automatically.
2. Connect this GitHub repo as a service.
3. In the service's **Variables** tab, set:
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_TRUST_HOST=true` — required behind Railway's HTTPS proxy
   - `CRON_SECRET` — any random string; used to authenticate cron calls
   `DATABASE_URL` is already wired up by the Postgres plugin.
4. Deploy. Watch the deploy logs to confirm the pre-deploy step ran
   `npm run db:migrate` and the app started.
5. Visit the Railway-provided URL (`<service>.up.railway.app`) and verify the
   homepage loads, then register a new account to confirm Auth.js + DB writes
   are working end to end.

## Cron setup (events lifecycle)

The events lifecycle (transitioning events between `published`,
`accepting_applications`, `reviewing`, etc. based on dates) is driven by an
HTTP endpoint at `/api/cron/events/tick`. It needs to be hit on a schedule by
an external scheduler — Railway-internal cron is not used. Recommended:
<https://cron-job.org> (free tier is enough).

### Configure cron-job.org

1. Sign up for cron-job.org.
2. Create a new cron job with:
   - **URL**: `https://<service>.up.railway.app/api/cron/events/tick`
   - **Method**: GET
   - **Headers**: `Authorization: Bearer <CRON_SECRET value>` (use the same
     value set on the Railway service)
   - **Schedule**: every hour at `:00`. The endpoint is idempotent and its
     date comparisons are day-granular, so hourly is the practical floor of
     usefulness.
3. Save and enable the job.

### Verify

After enabling the job, confirm runs are landing on the service:

1. **In cron-job.org**: open the job's history. Each scheduled run should
   show a 2xx response. 4xx means the bearer token is wrong or the route is
   misconfigured; 5xx means the handler errored — check Railway logs.
2. **In Railway logs**: tail the service log and look for lines matching
   `[cron/events/tick]`. Each invocation produces a single heartbeat line
   like:

   ```
   [cron/events/tick] opened=0 closed=0 floorPlansPublished=0
   ```

   The line is emitted on **every** run including no-ops. If the cron-job.org
   history shows recent runs but Railway logs have no matching heartbeat
   lines (or vice versa), the two ends are out of sync — investigate before
   relying on the schedule.

## Demo database reset cron

A second cron endpoint at `/api/cron/db-reset` can wipe and re-seed the demo
database on a 24-hour schedule so demos always start from a known state. It is
**inert by default**: even with the bearer token, the route refuses to do
anything unless `ENABLE_DB_RESET=true` is also set on the service. Only enable
this on a dedicated demo Railway service. **Setting `ENABLE_DB_RESET=true` on
a real production environment will allow demo data to wipe the production
database on a schedule.**

### Configure on a demo Railway service

1. In the demo service's **Variables** tab, set:
   - `CRON_RESET_SECRET` — generate with `openssl rand -base64 32`. Must be
     different from `CRON_SECRET` so the events tick token can't trigger a
     reset.
   - `ENABLE_DB_RESET=true` — the opt-in guard.
2. Redeploy so the new variables take effect.

### Configure cron-job.org

1. Create a second cron job with:
   - **URL**: `https://<demo-service>.up.railway.app/api/cron/db-reset`
   - **Method**: **POST** — note this differs from the events tick
     endpoint above, which is GET. cron-job.org's default is GET, so
     verify the method dropdown before saving or you'll get a 405.
   - **Headers**: `Authorization: Bearer <CRON_RESET_SECRET value>`
   - **Schedule**: once every 24 hours, e.g. daily at 04:00 UTC.
2. Save and enable the job.

### Verify

The endpoint accepts the request asynchronously: it returns `202 Accepted`
within a few seconds and then does the reset+seed work in the background
(image processing for ~100 portfolios takes a few minutes). The 202 response
in cron-job.org's history only confirms the work was *started*, not that it
finished.

To confirm a run completed:

1. **In Railway logs**: tail the demo service log and look for lines starting
   with `[db-reset]`. A successful run produces:

   ```
   [db-reset] start
   [db-reset] phase=reset starting
   [db-reset] phase=reset done ms=... { deleted: ..., total: ..., emails: [...] }
   [db-reset] phase=conventions starting
   [db-reset] phase=conventions done ms=... { manifests: ..., conventionsCreated: ..., ... }
   [db-reset] phase=artists starting
   [db-reset] phase=artists done ms=... { total: ..., created: ..., portfoliosSeeded: ..., ... }
   [db-reset] phase=applications starting
   [db-reset] phase=applications done ms=... { eventsSeeded: ..., newlyCreated: ..., ... }
   [db-reset] complete ms=...
   ```

   Each `phase done` line is followed by the phase's structured result; the
   exact fields vary per phase. Grep for `[db-reset] complete` to confirm the
   whole chain succeeded.

2. A failure logs:

   ```
   [db-reset] phase=<name> failed <stack trace>
   [db-reset] aborted phase=<name> ms=<elapsed>
   ```

   …and aborts the chain. The next scheduled run will pick up cleanly because
   the reset phase is idempotent. Grep for `[db-reset] aborted` to find
   failed runs.

### Rotate the secret

1. In the Railway service's Variables tab, set `CRON_RESET_SECRET` to a new
   value and redeploy.
2. Update the `Authorization` header on the cron-job.org job to match.
3. Trigger a manual run from cron-job.org to confirm the new value works.

### Operational notes

- **Don't run two resets concurrently.** There is no concurrency lock; an
  overlapping manual "Run now" from cron-job.org while the previous run is
  still seeding will race on the same database.
- **Storage files are not cleaned up.** `LocalStorageAdapter` writes to
  `./uploads` which Railway already wipes on redeploy, so this is
  self-correcting today. If R2 is wired in later, orphaned files in R2 will
  need a separate cleanup pass.

## Known limitations

The first Railway deploy uses stub adapters for the file-bound integrations:

- **File uploads are ephemeral.** `LocalStorageAdapter` writes to `./uploads`,
  which Railway wipes on every redeploy. Implement R2 storage before relying
  on uploaded portfolio/convention assets surviving a deploy.
- **Email is logged, not delivered.** `ConsoleEmailAdapter` prints messages to
  the Railway logs instead of sending them. Implement Resend (or another
  provider) for real notifications.
- **Push notifications are not implemented.** Web Push will need a
  `web-push` integration and VAPID keys.

These are tracked as separate follow-up specs.
