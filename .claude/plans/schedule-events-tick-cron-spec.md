# Schedule events tick cron in production

## Problem Statement
`src/app/api/cron/events/tick/route.ts` is deployed and bearer-authenticated, but no scheduler currently calls it. Time-based event transitions (opening application windows, closing them, auto-publishing floor plans) therefore silently do not run on the live Railway deployment. The README already describes the intended cron-job.org setup, but the schedule has not been created and there is no Railway-side signal that any tick happened.

## Requirements
- [REQ-1] A cron-job.org job is configured against the live Railway URL, calling `GET /api/cron/events/tick` with `Authorization: Bearer <CRON_SECRET>` on the hourly schedule documented in the README.
- [REQ-2] The tick handler emits a single log line per invocation summarizing the run, including the three counters it already returns (`opened`, `closed`, `floorPlansPublished`).
- [REQ-3] The log line is emitted on every run, including no-op runs where all counts are zero.
- [REQ-4] The README's existing "Cron setup (events lifecycle)" section is updated to (a) describe the verification step using the new log line and (b) read as a complete operator checklist that another operator can follow from scratch.

## Scope

### In Scope
- One log line added to the tick handler at the end of a successful run.
- README polish to the existing cron section: a verification subsection and a complete operator checklist (account, job creation, URL/method/headers, cadence, verification).
- Operator action: create the cron-job.org job and confirm it runs.

### Out of Scope
- Failure alerting (cron-job.org email-on-failure configuration). The job-history view is enough for now.
- Secret-rotation runbook for `CRON_SECRET`.
- Any change to scheduler choice, the existing auth behavior, or the per-event error-logging already in the handler.
- The 24h demo-reset cron (#18) — separately tracked and depends on a different secret.

## Acceptance Criteria
- [ ] cron-job.org has a job configured to `GET https://<railway-host>/api/cron/events/tick` with the correct bearer header on `0 * * * *`.
- [ ] cron-job.org's job history shows at least 3 consecutive successful (2xx) runs.
- [ ] Railway logs for the same window show 3 corresponding tick log lines, each containing `opened`, `closed`, `floorPlansPublished` values.
- [ ] A run with all counters at zero still produces a log line in Railway logs.
- [ ] The README's "Cron setup (events lifecycle)" section, read in isolation, contains every step needed to recreate the schedule on a new Railway service (account, job config, verification).
- [ ] An event with `status='published'` and `applicationOpenDate=<today UTC>` on the live deployment transitions to `accepting_applications` within one hour of the scheduled tick, with a corresponding log line.

## Constraints
- Bearer comparison and 401 behavior must not change.
- The log line must not include `CRON_SECRET` or any other secret-bearing field (the handler does not today — preserve).
