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
