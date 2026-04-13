# Project

**Conaro** — A web platform for artists to apply for convention stands. Artists maintain a profile and portfolio once; conventions define events with application periods; applying is one click. Replaces the current process of Google Forms, spreadsheets, and email.

**Tech stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Drizzle ORM + PostgreSQL (Railway) + Auth.js v5 + Cloudflare R2 + Resend

**PRD**: `tasks/prd-conaro.md`

# Workflow — MANDATORY

Every conversation that involves code changes follows this workflow:

**Specify → Design → [Implement → Verify → Commit] (per task) → Review → Test → Feedback**

## Scope check

Not every change needs the full ceremony. Use judgment:

- **Trivial changes** (typo fixes, renames, adding a log line, 1-2 file changes with no design decisions): skip directly to step 3 (Implement). After committing, skip steps 4–6 — present the result to the user directly without invoking the review, testing, or feedback skills.
- **Scoped bug fixes** where the problem and fix are already clear: skip directly to step 3 (Implement). After committing, skip to step 6 (Feedback) to briefly present the fix and confirm with the user.
- **Everything else** (new features, refactors, multi-file changes, anything with design decisions): follow the full workflow starting at step 1 (Specify).

If during a trivial or scoped change you discover the scope is larger than expected, stop and escalate to the full workflow starting at step 1 (Specify).

When in doubt, start earlier rather than later. Skipping specification and design for a change that needed them is far more expensive than doing them for a change that didn't.

## 1. Specify

- Use the `feature-spec` skill to explore the codebase, discuss requirements with the user, and produce a detailed feature specification.
- NEVER begin implementation planning until a specification exists as a file in `.claude/plans/` and the user has confirmed it.
- If the user provides a specification inline (e.g. in the conversation), save it to `.claude/plans/<name>-spec.md` before proceeding.

## 2. Design

- Use the `implementation-plan` skill to create a detailed technical plan from the approved specification.
- NEVER begin writing code until an implementation plan exists as a file in `.claude/plans/` and the user has confirmed it.
- If the specification has unresolved open questions, return to step 1 (Specify) to resolve them first.

## 3. Implement (per-task loop)

When a plan exists, repeat steps 3a–3c for each task. Do not batch multiple tasks — complete the full implement → verify → commit cycle for one task before starting the next. When entering directly via the scope check (trivial changes, scoped bug fixes), treat the change itself as the single task.

### 3a. Implement

- **Read the relevant code before modifying it.** Understand the current state before making changes. Do not edit files you haven't read.
- Implement the task according to the plan. If there is no plan (scope check fast path), implement the change directly.
- When a plan exists, **NEVER** take implementation decisions that were not discussed in the planning phase. If you discover an unplanned decision is needed, stop and return to step 2 (Design) to discuss before continuing.
- **ALWAYS** follow the standards and best practices outlined in @STANDARDS.md.

### 3b. Verify

- Run the project's test suite and any project-wide automated checks (type checking, linting, build verification, integration tests).
- If quality hooks are installed, per-file type checking and linting run automatically on each edit — in that case, focus this step on tests and project-wide checks that hooks don't cover.
- Fix any failures before proceeding to commit.

### 3c. Commit

- Use the `logical-commit` skill to commit the completed task.
- If an implementation plan exists, update it: mark the task as completed with any relevant notes and include the plan file in the commit.

## 4. Review

- After all tasks in the plan are implemented (or after completing a logical group of tasks in a large plan), use the language-appropriate `review` skill for a full code review.
- The review covers the entire changeset, not individual tasks — this is where design-level issues, cross-cutting concerns, and consistency problems are caught.
- If the review requests changes, return to step 3 (Implement) to address them, then re-review.

## 5. Test

- Use the `manual-testing` skill for end-to-end validation of the completed feature.
- If a specification exists, verify each acceptance criterion. Check them off in the spec file as they pass.
- Write a test results file next to the plan in `.claude/plans/`.
- If issues are found, return to step 3 (Implement) to fix them, then re-review and re-test.

## 6. Feedback

- Use the `feedback` skill to present completed work and gather structured user feedback.
- Do not consider work complete without explicit user sign-off.

## Phase transitions

These are the valid reasons to return to an earlier phase. When a transition triggers, act on it immediately without waiting for user input — iterate autonomously until the issue is resolved, then continue the workflow.

- **Implement → Design**: An unplanned technical decision is needed that wasn't covered in the plan.
- **Design → Specify**: The specification is incomplete, ambiguous, or has unresolved open questions.
- **Review → Implement**: The review found code-level issues that need fixing.
- **Review → Design**: The review found a fundamental design problem (wrong abstraction, incorrect module boundary, architectural issue).
- **Test → Implement**: Bugs or issues are found during manual testing (re-review after fixing).
- **Feedback → any phase**: User feedback requires changes — return to the appropriate phase.

# Project Standards

Always read and follow @STANDARDS.md for code style, architecture and best practices. Adherence to project standards is non-negotiable.
