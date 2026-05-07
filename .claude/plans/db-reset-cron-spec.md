# 24h Demo Database Reset Cron Endpoint

## Problem Statement

The Railway demo deployment needs a way to wipe and re-seed its database on a 24-hour schedule so demos always start from a known, predictable state. The existing seeding workflow (`npm run db:reset-and-seed`) is a tsx-based CLI chain that depends on a local env file and cannot be invoked remotely. Without an HTTP-triggerable equivalent, the demo data drifts as visitors interact with it and there is no automated way to restore it.

## Requirements

- [REQ-1] An authenticated HTTP endpoint exists that, when called, performs the equivalent of `npm run db:reset-and-seed` (delete seed-domain users, then seed conventions, 100 artists with portfolios, and applications) against the runtime `DATABASE_URL`.
- [REQ-2] The endpoint is bearer-authenticated using a `CRON_RESET_SECRET` env var, separate from the existing `CRON_SECRET`. Auth comparison uses constant-time equality (matching the `secureCompare` pattern in `src/app/api/cron/events/tick/route.ts`).
- [REQ-3] The endpoint refuses to run unless an explicit opt-in env var (`ENABLE_DB_RESET=true`) is set on the service. Without it, the endpoint returns an error response indicating it is disabled. This guard exists so the route is inert by default on any environment that wasn't deliberately configured for demos.
- [REQ-4] Missing or misconfigured `CRON_RESET_SECRET` (env var unset or empty) results in a server error response, not silent success.
- [REQ-5] The endpoint accepts authenticated requests asynchronously: it returns `202 Accepted` once auth and the safety guard pass, then performs the reset+seed work in the background. The HTTP response does not wait for seeding to complete.
- [REQ-6] All four seed phases (reset, conventions, artists with 100 portfolios, applications) run in order and any failure in a phase is logged with enough context to diagnose from Railway logs. A failure in one phase does not silently mark the run as successful.
- [REQ-7] `cron-job.org` (or any equivalent scheduler) configured to call this endpoint once every 24 hours produces a successful HTTP response on each call (because of the async 202 contract) regardless of how long the seeding takes.
- [REQ-8] `.env.example` documents `CRON_RESET_SECRET` and `ENABLE_DB_RESET`, and the README (or STANDARDS.md) documents how to configure the cron-job.org schedule for a demo Railway service.

## Scope

### In Scope

- A new HTTP route in the Next.js app that exposes the reset+seed action.
- Refactoring the existing seed scripts (`scripts/seed-*.ts`) enough to make their core logic invokable from a Next.js route handler. The CLI entrypoints continue to work for local development.
- The two new env vars (`CRON_RESET_SECRET`, `ENABLE_DB_RESET`) plus documentation.
- Operational documentation: how to set up the cron-job.org schedule, how to rotate the secret, how to confirm a run succeeded from Railway logs.

### Out of Scope

- Cleanup of orphaned files in storage. The existing `seed-reset.ts` already documents that storage files are not removed. With local-fs ephemeral storage on Railway, this is self-correcting on redeploy. With R2 (issue #13), this becomes a separate concern to be addressed there.
- A status / progress endpoint for in-flight runs. Logs in Railway are the source of truth.
- Idempotency or concurrency locking against overlapping runs. Acceptable on a dedicated demo environment with 24h cadence.
- Running this endpoint anywhere other than a dedicated demo Railway service. The opt-in guard is the only protection — it is the operator's responsibility not to set `ENABLE_DB_RESET=true` on a real production environment.
- Triggering the endpoint from any caller other than cron-job.org (or equivalent external scheduler). No UI affordance.

## Acceptance Criteria

- [ ] Calling the endpoint without an `Authorization: Bearer ...` header returns `401`.
- [ ] Calling the endpoint with the wrong bearer token returns `401`.
- [ ] Calling the endpoint with the correct bearer but with `ENABLE_DB_RESET` unset returns an error response (e.g., `403`) and does not delete or insert any data.
- [ ] Calling the endpoint with `CRON_RESET_SECRET` unset on the server returns `500`.
- [ ] Calling the endpoint with the correct bearer and `ENABLE_DB_RESET=true` returns `202` within a few seconds, regardless of dataset size.
- [ ] After a successful run, the database contains the same shape of seed data as `npm run db:reset-and-seed` produces locally (seed-domain users, conventions, ~100 artists with portfolios, applications).
- [ ] After a successful run, no users with non-seed email domains have been deleted (verifiable on a DB that was pre-populated with both seed and non-seed users).
- [ ] A failure in any seed phase produces a clear error log line in Railway with the failing phase name and underlying error.
- [ ] cron-job.org configured to call the endpoint with the bearer token executes successfully on each scheduled run (verified by checking job history shows 2xx responses and Railway logs show the run completed).
- [ ] `.env.example` lists `CRON_RESET_SECRET` and `ENABLE_DB_RESET` with safe placeholder values.
- [ ] Documentation explains how to (a) enable the endpoint on a fresh demo service, (b) configure cron-job.org, (c) rotate the secret.

## Constraints

- The seed scripts currently exit the process via `process.exit()` and rely on a local env file. They cannot be invoked from a long-running Next.js process as-is. The shape of the refactor (extract to importable modules vs. another approach) is an implementation-plan decision, but the seed logic must run inside the same Node process as the route handler.
- `scripts/seed-assets/` (portfolio fixture images, manifests) must be present in the deployed Railway artifact. `next build` does not copy `scripts/` into `.next/` by default, so the implementation plan must address how these assets reach runtime.
- Bearer comparison must be constant-time (use the existing `secureCompare` helper or equivalent). Do not introduce a string-equality timing leak.
- This feature depends on issue #15 (production-runnable migrations) so the demo DB schema is in place before the endpoint is first invoked. It does not depend on #13 (R2) or #14 (Resend) — local-fs storage and console email are both acceptable in a demo environment.
