# Railway Deployment Plumbing

## Problem Statement

The conaro app currently runs only against a local Postgres in docker-compose. To stand up a Railway service, several pieces of plumbing don't yet exist: the DB pool doesn't enable SSL (which Railway Postgres requires), every `db:*` and `test*` npm script hardcodes `--env-file .env.local` (which doesn't apply on Railway where env comes from the platform), there's no automated migration step on deploy, Auth.js v5 needs explicit configuration to work behind Railway's HTTPS proxy, the events-tick cron isn't connected to any scheduler, and `.env.example` doesn't document what an operator must provide.

This spec covers the deployment plumbing only. File storage stays on the local-disk stub adapter (uploads will be ephemeral on Railway — an explicitly accepted limitation) and email stays on the console stub (emails only logged). R2, Resend, and web-push are separate follow-up specs.

## Requirements

- [REQ-1] The DB connection works against a Railway-hosted Postgres (with SSL) without breaking the existing local docker-compose Postgres (no SSL).
- [REQ-2] Database migrations apply automatically as a release/predeploy step on every Railway deploy. The app does not start serving traffic until migrations finish successfully.
- [REQ-3] All npm scripts that today rely on `node --env-file .env.local` (or `.env.test`) work in both environments without that flag — local dev uses a documented mechanism (e.g. direnv, dotenv-cli, or shell sourcing) to load the env file, and Railway uses platform env vars. The full local dev workflow (`npm run db:migrate`, `npm run db:seed:*`, `npm test`) continues to work after one documented setup step.
- [REQ-4] Auth.js v5 works correctly behind Railway's HTTPS proxy: registration and login succeed end-to-end on the deployed `*.up.railway.app` URL, with sessions persisting across requests and secure cookies set correctly.
- [REQ-5] An external scheduler (cron-job.org or equivalent) configured to hit the deployed `/api/cron/events/tick` endpoint with a valid `CRON_SECRET` returns 200 and runs the event lifecycle transitions.
- [REQ-6] `.env.example` lists every env var required to boot the app on Railway, with safe placeholder values and a one-line comment explaining each.
- [REQ-7] Operator-facing deployment documentation in `README.md` walks someone through standing up a fresh Railway service from scratch: provision Postgres, set env vars, trigger first deploy, configure the external cron scheduler.
- [REQ-8] After deploy, the smoke test passes: an unauthenticated visitor can load the homepage; a new visitor can register, log in, log out, and log back in.

## Scope

### In Scope

- DB pool SSL handling that works with both Railway Postgres (SSL required) and local docker-compose Postgres (no SSL).
- A migration runner that reads from `process.env` directly (no `--env-file`), suitable to run as a Railway release command.
- Removing `--env-file` flags from all npm scripts (`db:migrate`, `db:migrate:test`, `db:studio`, `db:seed:*`, `test`, `test:watch`) and providing a documented local-dev replacement.
- Auth.js v5 production env wiring (`AUTH_SECRET`, `AUTH_TRUST_HOST` and/or `AUTH_URL`).
- A Railway deploy config file (`railway.json` or `nixpacks.toml`) that specifies build, release-phase migrate, and start commands.
- Updated `.env.example` covering all production-required env vars with comments.
- A README section documenting end-to-end Railway deploy setup, including how to configure an external cron scheduler (cron-job.org or equivalent) for `/api/cron/events/tick`.

### Out of Scope

- Implementing R2 storage (LocalStorageAdapter remains; uploads are ephemeral on Railway — explicitly accepted).
- Implementing Resend email (ConsoleEmailAdapter remains; emails only logged — explicitly accepted).
- Implementing web-push.
- Custom domain / DNS configuration.
- The `db-reset-cron-spec.md` work (separate in-flight spec; this plumbing must not preclude it but doesn't have to enable it either).
- CI / test database hosting (the test DB stays local-only).
- Performance tuning (pool sizing, caching, image optimization).
- Monitoring, log aggregation, error tracking (Sentry etc.).
- Triggering the actual production deploy (per `.claude/rules/safety.md`, this spec produces config and code only — the user runs the deploy manually).

## Acceptance Criteria

These are verified during manual testing (step 5 of the workflow). Each must be checked off before the feature is considered complete.

- [ ] A fresh Railway service deployed from `main` builds successfully with no manual steps beyond setting env vars in the Railway UI.
- [ ] On first deploy, all 23 existing migrations apply against Railway Postgres before the app starts serving traffic.
- [ ] On subsequent deploys (no schema change), the migration release step runs and exits cleanly with no migrations applied.
- [ ] On a deploy that includes a new migration, the new migration applies cleanly and the app starts.
- [ ] Visiting the deployed homepage URL returns 200.
- [ ] Registering a new account on the deployed URL persists rows to the Railway DB and lands the user in a logged-in state.
- [ ] Logging out and back in restores the same session.
- [ ] `npm run db:migrate`, `npm run db:seed:reset`, `npm run db:seed:conventions`, and `npm test` all work locally with no `--env-file` flag in the script, after the documented one-line setup step.
- [ ] `.env.example` lists `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST` (and/or `AUTH_URL`), and `CRON_SECRET`, each with a placeholder value and a short comment.
- [ ] An operator following the README deploy doc end-to-end on a fresh Railway account can stand up a working conaro instance without help.
- [ ] cron-job.org (or equivalent) configured per the deploy doc successfully hits `/api/cron/events/tick` on schedule; the Railway logs show 200 responses with `{ opened, closed }` payloads.

## Constraints

- Local docker-compose Postgres has no SSL; Railway Postgres requires SSL. The DB pool config must support both.
- All existing `vitest` tests must continue to pass against `.env.test` after the script changes.
- This spec must leave room for the in-flight `db-reset-cron-spec.md` to add `CRON_RESET_SECRET` and `ENABLE_DB_RESET` later without rework.
- Per `.claude/rules/safety.md`, this spec must not trigger any deploy. It produces config and code; the user runs the deploy manually.
