---
name: implementation-plan
description: Create a detailed technical implementation plan from an approved feature specification.
version: 1.0.0
---

# Implementation Planning

Take an approved feature specification and produce a detailed, codebase-aware technical plan. This plan defines HOW to build what the spec describes, broken into ordered tasks with file-level detail, technical decisions, and verification steps. No full code — only enough detail for a developer (or agent) to implement each task without ambiguity.

## Principles

1. **The spec is the source of truth** — The approved specification defines WHAT to build. This plan defines HOW. Do not add, remove, or reinterpret requirements. If the spec is incomplete or ambiguous, stop and flag the specific issue rather than guessing.
2. **One task, one area** — Each task should be a single logical unit of work that touches one area of the codebase. If a task spans multiple unrelated areas or requires distinct implementation steps in separate modules, split it.
3. **No full code** — Use file paths, function/component names, descriptions of changes, and pseudo-code only when the logic is non-obvious. The implementation phase writes the code, not the plan.
4. **Test-first where applicable** — Prefer red-green test approaches: describe what test to write first, then what implementation makes it pass. Not every task needs this, but logic-heavy tasks benefit from it.
5. **Dependency ordering** — Order tasks so each can be implemented and committed independently. A task should never depend on uncommitted work from a later task.
6. **Flag, don't assume** — If investigation reveals the spec is incomplete, infeasible, or contradicts the codebase, stop and flag the specific issue. Do not silently work around it.

## Context Gathering

- Read the approved spec file from `.claude/plans/`.
- Read CLAUDE.md and STANDARDS.md for project conventions.
- Use `empty-agent` sub-agents in parallel to deeply investigate the code areas that will be modified. Focus on: interfaces, types/schemas, existing test patterns, module boundaries, import/export structure, and any code that will be directly touched or extended.

For each sub-agent, provide a detailed ad-hoc prompt and clearly outline output format expectations to get only the information you need.

## Workflow

1. **Read the spec** — Load the approved specification from `.claude/plans/`. If no spec exists, or it has unresolved open questions, stop and tell the user to complete the specification first using the `feature-spec` skill.

2. **Investigate** — Use parallel `empty-agent` sub-agents to deeply read the code areas that will change. For each area, understand: current structure, interfaces, existing test coverage, and conventions. Identify reusable code — functions, utilities, patterns — that should be leveraged rather than duplicated.

3. **Design** — Make technical decisions: what abstractions to use, where new code lives, how it connects to existing modules. For decisions where the codebase clearly indicates one approach, go with it and document the rationale. For non-obvious decisions with genuine trade-offs, propose 2-3 alternatives with trade-offs and your recommendation — do not decide unilaterally.

4. **Confirm decisions** — Present the technical decisions to the user for confirmation before breaking into tasks. This is a checkpoint — if the user disagrees with a decision, it's far cheaper to change course now than after the task breakdown is built on top of it. For decisions where you proposed alternatives, let the user choose. Once decisions are confirmed, proceed to planning.

5. **Plan** — Break down into ordered tasks. For each task, define: what to implement, which files to create or modify, how to approach it (without writing full code), how to verify it works, and what it depends on. Ensure tasks can be committed independently in order.

6. **Present** — Show the full plan (tasks, requirements coverage, risks) to the user for confirmation before implementation begins. Highlight any areas where you made judgment calls or where the spec left room for interpretation.

If investigation (2) reveals the spec is incomplete or infeasible, stop and flag the specific issue rather than proceeding with assumptions.

## Output Format

```markdown
# Implementation Plan: [Feature Name]

Spec: `.claude/plans/[feature-name]-spec.md`

## Technical Decisions
- **[Decision]**: [Rationale — why this approach over alternatives]
- **[Decision]**: [Rationale]

## Tasks

### 1. [Task title]
[1-3 line description of what this task accomplishes]

**Requirements:** [REQ numbers from spec, e.g. REQ-1, REQ-3. Use "Infrastructure" for tasks that enable other tasks but don't directly satisfy a user-facing requirement.]

**Files:**
- `path/to/file.ext` — [what changes: new file / modify function X / add type Y / extend interface Z]
- `path/to/test.ext` — [what test to add or modify]

**Approach:**
- [Step-by-step implementation notes — NO full code]
- [Pseudo-code only when logic is non-obvious]

**Verification:** [How to verify: test command, manual check, build passes, etc.]
**Depends on:** [Task numbers, or "none"]

### 2. [Task title]
...

## Requirements Coverage
| Requirement | Task(s) |
|---|---|
| REQ-1 | 1, 3 |
| REQ-2 | 2 |
Every requirement from the spec must appear in this table. If a requirement has no task, the plan is incomplete.

## Risks
- [Anything that could go wrong, needs extra attention, or might require revisiting the spec]
```

The **Requirements Coverage** table is mandatory — never omit it. Other sections (Technical Decisions, Risks) may be omitted if they have no content.

## File Path

Save implementation plans to: `.claude/plans/[descriptive-feature-name]-plan.md`
