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
an external scheduler — Railway-internal cron is not used.

Recommended scheduler: <https://cron-job.org> (free tier is enough).

1. Sign up for cron-job.org.
2. Create a new cron job:
   - **URL**: `https://<service>.up.railway.app/api/cron/events/tick`
   - **Method**: GET
   - **Headers**: `Authorization: Bearer <CRON_SECRET value>`
   - **Schedule**: every hour at `:00` is plenty (the endpoint is idempotent
     and the underlying date comparison is day-granularity).
3. Confirm successful runs by checking the job's history in cron-job.org and
   tailing the Railway service logs.

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
