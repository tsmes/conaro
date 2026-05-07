# Implementation Plan: Schedule events tick cron in production

Spec: `.claude/plans/schedule-events-tick-cron-spec.md`

## Technical Decisions

- **Log severity is `console.info`**: The tick handler already uses `console.error` for per-event failures. `console.info` is the right level for a healthy-heartbeat line and makes Railway log filtering trivial. No logger library is in the project — `console.*` is the convention everywhere.
- **Log format is `[cron/events/tick] opened=N closed=N floorPlansPublished=N`**: Single line, prefix-tagged so it can be grepped from a noisy log stream, key=value so each counter is independently parseable. No secret-bearing fields. The prefix matches the route path exactly so a future operator can search for the route they're trying to verify.
- **Log line fires unconditionally before the `NextResponse.json(...)` return**: Including the no-op case (all counts zero). REQ-3 makes this explicit — silence in logs must mean the schedule didn't run, never "the schedule ran but had no work".
- **Test the log assertion in the existing `__tests__/integration/event-cron.test.ts`**: That file already covers the tick handler with a real DB. Adding a `vi.spyOn(console, "info")` assertion alongside the existing happy-path tests is the smallest change and matches the test-collocation pattern in the file. No new test file needed.
- **README polish stays inside the existing "Cron setup (events lifecycle)" section**: Add a "Verify" subsection referencing the new log line; restructure the existing numbered list into a checklist that an operator can follow start-to-finish without prior context. No new top-level section.
- **Operator action (creating the cron-job.org job) is not a code task**: It is captured in the spec's acceptance criteria and verified in the manual-testing phase. The plan includes only repo-modifying tasks.

## Tasks

### 1. Add heartbeat log line to tick handler ✅

Emit a single summary log line at the end of every successful tick run, including no-op runs. Add an integration test asserting the line is emitted (both for runs that perform work and for runs that don't).

**Status:** Completed. `console.info` heartbeat added to `src/app/api/cron/events/tick/route.ts` immediately before the JSON response, formatted `[cron/events/tick] opened=N closed=N floorPlansPublished=N`. Two integration tests added in `__tests__/integration/event-cron.test.ts` covering the work-performed and no-op cases; both filter calls by the `[cron/events/tick]` prefix so they're robust to unrelated `console.info` calls. Full file passes (12/12), project typecheck and lint clean.

**Requirements:** REQ-2, REQ-3

**Files:**
- `src/app/api/cron/events/tick/route.ts` — add a single `console.info` call immediately before the existing `return NextResponse.json({ opened, closed, floorPlansPublished })` at the end of the handler.
- `__tests__/integration/event-cron.test.ts` — add two new test cases:
  1. The existing "transitions published events…" path emits a `console.info` line containing `opened=1`, `closed=0`, `floorPlansPublished=0`.
  2. A new no-op test (no events in DB) emits a `console.info` line with all counts zero.
  Use `vi.spyOn(console, "info")` inside each test, asserting the spy was called once with a string matching the expected format.

**Approach:**
- Place the log line on the line immediately preceding the return:
  ```
  console.info(`[cron/events/tick] opened=${opened} closed=${closed} floorPlansPublished=${floorPlansPublished}`);
  ```
- The handler currently has three counter variables (`opened`, `closed`, `floorPlansPublished`) all in scope at the return. No new state needed.
- For the test, set up the spy in `beforeEach` (or per-test) and restore via `mockRestore` in cleanup. Match the new line with a regex or `expect.stringContaining("[cron/events/tick]")` to avoid coupling to exact spacing.
- Do not change the response payload, status code, or auth flow.

**Verification:**
- `npm test -- event-cron` passes, including the two new assertions.
- `npm run build` and the project's typecheck pass.
- Eyeball the diff: exactly one line added in `route.ts`, no other behavior changes.

**Depends on:** none

### 2. Update README cron section into a complete operator checklist

Tighten the existing "Cron setup (events lifecycle)" section so it (a) reads as a self-contained operator checklist and (b) explains how to use the new heartbeat log line for verification.

**Requirements:** REQ-4

**Files:**
- `README.md` — modify the existing "Cron setup (events lifecycle)" section (around line 82). Keep the section heading. Restructure into:
  1. **Why** — one short paragraph (the existing intro is fine, lightly polished).
  2. **Configure cron-job.org** — numbered checklist: account, new job, URL, method, headers (with explicit reference to `CRON_SECRET` env var), cadence (`Every hour at :00`).
  3. **Verify** — new subsection: how to check job history in cron-job.org, and how to grep for `[cron/events/tick]` in Railway logs to confirm runs landed (referencing the new heartbeat line). Mention that the line is emitted on every run including no-ops, so absence of recent lines indicates a missed schedule.

**Approach:**
- Read the current section in full first (lines 82–99). Preserve existing accurate content; do not rewrite for its own sake.
- Do not document failure-alerting or secret-rotation — out of scope.
- Cross-link `CRON_SECRET` in this section with the existing Deployment (Railway) section's env-var checklist if the README structure makes that easy; not required.

**Verification:**
- Read the section top-to-bottom in isolation. Confirm an operator with no prior context could follow it from "I have a Railway URL and a `CRON_SECRET` value" to "I see the heartbeat in Railway logs" without external info.
- `npm run build` (Next.js does not parse README, but project hooks may run lint on docs).

**Depends on:** Task 1 (the verification step references the heartbeat line, which task 1 introduces).

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | Operator action — verified in manual testing, not a code task |
| REQ-2 | 1 |
| REQ-3 | 1 |
| REQ-4 | 2 |

## Risks

- **Spy timing in the integration test**: If another `console.info` call is added elsewhere on the request path (e.g., a middleware), the spy assertion could pick up an unexpected call and become flaky. Mitigation: assert on `expect.stringContaining("[cron/events/tick]")` rather than exact call count, so noise from elsewhere is tolerated.
- **REQ-1 cannot be satisfied by code changes alone**: The cron-job.org job creation is operator-only. The plan flags this honestly; the spec already accepts it.
- **Railway log retention**: Railway's free-tier log retention may be too short to verify "3 consecutive successful runs" within a single sitting at hourly cadence (3 hours of waiting). If this becomes a blocker during testing, temporarily setting the schedule to `*/5 * * * *` for verification is acceptable, then reverting to `0 * * * *`.
