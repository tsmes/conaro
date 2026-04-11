---
name: manual-testing
description: Manually test implemented features by running the application, exercising API endpoints with curl, and verifying frontend behavior with agent-browser.
version: 1.0.0
---

# Manual Testing

Verify that implemented features work correctly by running the application and interacting with it. This is not unit testing — it is hands-on validation that the feature behaves as expected from a user's perspective.

## Principles

- Test what the user experiences, not internal implementation details.
- Start with the happy path, then probe edge cases and error states.
- Every test should trace back to a requirement from the plan. If there's no plan, ask the user what to validate before proceeding.
- Stop testing when you have confidence the feature works. Don't invent exhaustive scenarios that go beyond the scope.
- If something fails, capture enough detail to reproduce it — don't immediately switch to fixing.

## Prerequisites

Before testing, ensure:

1. The application is running. If not, start it using the project's standard method (check `README.md`, `package.json` scripts, `Makefile`, `docker-compose.yml`, etc.).
2. Any required services (database, external APIs, queues) are available.
3. You have the plan or feature description to test against.

If prerequisites can't be met, stop and tell the user what's missing.

## API Testing with curl

Use `curl` to test API endpoints directly. This is appropriate for:

- REST API endpoints
- Webhooks
- Any HTTP-based interface

### Approach

1. **Read the plan** to identify endpoints, expected request/response shapes, and status codes.
2. **Test the happy path first** — valid request, expected response, correct status code.
3. **Test error cases** — missing fields, invalid values, unauthorized access, not-found resources.
4. **Verify side effects** — if the endpoint creates/modifies data, confirm the change persists (e.g., GET after POST).

### Practical notes

- Use `-s` (silent) and pipe through `jq` or `python -m json.tool` for readable output.
- Use `-w '\n%{http_code}\n'` to capture status codes.
- For authenticated endpoints, obtain a token first and pass it via `-H 'Authorization: Bearer ...'`.
- Save common base URLs and tokens in variables to keep commands readable.
- **Do not inline env vars as command prefixes** (e.g., `BASE_URL=x curl ...`) — this breaks permission matching because rules match from the start of the command string. Instead, `export` variables first or use `env BASE_URL=x curl ...`.
- For file uploads, use `-F 'file=@path/to/file'`.

Example workflow:

```bash
BASE_URL="http://localhost:3000/api"

# Happy path
curl -s -X POST "$BASE_URL/users" \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test User", "email": "test@example.com"}' | jq .

# Verify it persisted
curl -s "$BASE_URL/users/1" | jq .

# Error case: missing required field
curl -s -X POST "$BASE_URL/users" \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test User"}' -w '\n%{http_code}\n'
```

## Frontend Testing with agent-browser

Use `agent-browser` to test frontend behavior. This is the `agent-browser` skill — refer to it for the full command reference. This is appropriate for:

- User-facing web interfaces
- Forms, navigation, interactive components
- Visual verification of rendered content

### Approach

1. **Read the plan** to identify user flows and expected behavior.
2. **Open a browser and navigate** to the feature.
3. **Take a snapshot** to see the page structure and element refs (e.g., `@e1`, `@e2`).
4. **Interact with the feature** — fill forms, click buttons, follow flows using element refs from the snapshot.
5. **Take screenshots** at key points for evidence.
6. **Close the browser** when done.

### Practical notes

If `agent-browser` commands fail with browser-related errors, run `agent-browser install` to install the required browser binary.

Use `snapshot -i` to get interactive element refs (e.g., `@e3`, `@e15`) that you can then target with `click`, `fill`, etc. Refs are invalidated when the page changes — always re-snapshot after navigation or DOM changes.

```bash
# Open browser and navigate
agent-browser open http://localhost:3000/dashboard

# See interactive elements and their refs
agent-browser snapshot -i

# Interact using refs from the snapshot
agent-browser fill @e5 "user@example.com"
agent-browser fill @e8 "password123"
agent-browser click @e12

# Take a screenshot for evidence
agent-browser screenshot after-login.png

# Check page state after interaction
agent-browser snapshot -i

# Close when done
agent-browser close
```

For multi-step flows, keep the browser open between commands — `agent-browser` maintains session state via a background daemon. Use `snapshot -i` after each interaction to get updated element refs.

For authenticated flows, save and restore browser state across test runs:

```bash
agent-browser open http://localhost:3000/login
agent-browser snapshot -i
agent-browser fill @e3 "test@example.com"
agent-browser fill @e5 "password"
agent-browser click @e7
agent-browser wait --load networkidle
agent-browser state save auth.json

# Later, reuse the auth state
agent-browser state load auth.json
agent-browser open http://localhost:3000/dashboard
```

## Workflow

1. **Read the plan** → Identify what was implemented, the requirements, and acceptance criteria. If no plan exists, ask the user what to test.
2. **Determine test type** → API (curl), frontend (agent-browser), or both. Base this on what was implemented.
3. **Ensure prerequisites** → Verify the application is running and accessible. Start it if needed.
4. **Test happy paths** → Verify the core functionality works as specified.
5. **Test error cases** → Verify the feature handles invalid input, missing data, and edge cases gracefully.
6. **Capture results** → Record what passed, what failed, and any unexpected behavior. Include screenshots for frontend tests.
7. **Write test report** → Save results next to the plan.

If a test fails, do not fix the issue immediately. Record the failure with reproduction steps and continue testing to get a complete picture. Fixes happen back in implement mode.

## Test Report Format

Save the report next to the plan file (e.g., `.claude/plans/[feature-name]-test-results.md`).

```markdown
# Test Results: [Feature Name]

Date: [date]
Plan: [link to plan file]
Status: [PASS / FAIL]

## Summary

[1-2 sentences: what was tested, overall result]

## Results

### [Test area or endpoint]

- [x] [What was tested] — [result]
- [x] [What was tested] — [result]
- [ ] [What was tested] — **FAIL**: [brief description]

## Failures

### [Failure title]

**Steps to reproduce:**

1. [step]
2. [step]

**Expected:** [what should happen]
**Actual:** [what happened]
**Screenshot:** [path if applicable]

## Notes

[Any observations, edge cases discovered, or concerns not covered by the plan]
```

Omit sections that have no content (e.g., no Failures section if everything passed).
