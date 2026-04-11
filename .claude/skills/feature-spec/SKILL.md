---
name: feature-spec
description: Explore the codebase, discuss requirements with the user, and produce a detailed feature specification.
version: 1.0.0
---

# Feature Specification

Produce a clear, complete feature specification by exploring the codebase, extracting unknowns from the user's intention, and converging on a detailed definition through structured discussion. The goal is to eliminate ambiguity and ensure every requirement is explicit, scoped, and verifiable before any implementation planning begins.

## Principles

1. **YAGNI above all** — Only specify what the user explicitly needs right now. Resist scope creep, nice-to-haves, future-proofing, and "while we're at it" additions. If a requirement doesn't serve the immediate goal, cut it.
2. **One question at a time** — Ask a single focused question per message. Users give better answers when they can think about one thing. If a topic needs more exploration, break it into a sequence of questions. Never batch multiple questions into one message.
3. **Suggest, don't just ask** — When asking clarifying questions, always provide concrete recommendations based on what you found in the codebase. If there's an obvious pattern or convention, present it as the default option. Don't force the user to generate answers from scratch.
4. **Multiple-choice over open-ended** — Use the AskUserQuestion tool with structured options wherever possible. This reduces cognitive load, speeds up decisions, and keeps scope tight. Reserve open-ended questions for genuinely novel decisions where the codebase offers no guidance.
5. **Explore before converging** — Before settling on an approach, propose 2-3 alternatives with trade-offs. Lead with your recommendation and explain why, but let the user see the option space. This prevents premature convergence and surfaces trade-offs the user should weigh.
6. **WHAT and WHY, never HOW** — Specifications describe the desired outcome from the user's perspective. Implementation details, technical decisions, and code structure belong in the implementation plan, not here.
7. **Every requirement must be verifiable** — If you cannot describe how to confirm a requirement is met, it is not a requirement. Rewrite it until it is testable, or remove it.
8. **Investigate before asking** — Explore the codebase first so your questions are informed. Don't ask the user things the code already answers.

## Context Gathering

Before engaging the user, gather context to inform your questions and recommendations:

- Read CLAUDE.md, CONTRIBUTING.md, README.md and scan for other relevant documentation.
- Use `empty-agent` sub-agents with specific, targeted instructions to investigate areas of the codebase relevant to the feature. Launch multiple sub-agents in parallel when investigating independent areas.
- Focus on: existing patterns that relate to the feature, architectural constraints, similar existing features, API boundaries, data models, and conventions.
- Gather only what is needed for specification decisions — do not read the entire codebase.

For each sub-agent, provide a detailed ad-hoc prompt and clearly outline output format expectations to get only the information you need.

## Workflow

1. **Investigate** — Explore the codebase to understand relevant patterns, constraints, and existing functionality. Use parallel `empty-agent` sub-agents for independent areas. Understand the landscape before asking the user anything. Identify what decisions the codebase already answers vs. what requires user input.

2. **Clarify** — Ask the user questions to define scope and requirements. One question per message — do not batch. Use AskUserQuestion with multiple-choice options wherever possible. For each question, provide a recommendation when you have one. Only ask questions whose answers would materially change the spec — avoid exhaustive questioning. When you've identified a meaningful choice point, propose 2-3 approaches with trade-offs, lead with your recommendation, and let the user choose.

3. **Explore approaches** — Once the scope is understood, propose 2-3 high-level approaches for the overall feature. For each approach, briefly describe what it looks like from the user's perspective and what the key trade-offs are (complexity, flexibility, scope). Lead with your recommended approach and explain why. Let the user choose before proceeding.

4. **Align** — Present the design section by section. For each section (problem statement, requirements, scope, acceptance criteria), present it and ask "does this look right?" before moving on. This catches misalignment incrementally rather than forcing the user to review a wall of text. If the user corrects or adjusts, revise and re-present that section before continuing.

5. **Specify** — Write the full specification document according to the output format below. Before including each requirement, critically assess it against YAGNI — if it doesn't directly serve the confirmed scope, remove it. Save the file to `.claude/plans/`.

Steps are not strictly linear. If Align (4) reveals gaps, return to Clarify (2) or Investigate (1) as needed. Iterate until the scope is solid before finalizing the spec.

## Output Format

```markdown
# [Feature Name]

## Problem Statement
[What problem does this solve? Why does it need to be solved now? 2-4 sentences max.]

## Requirements
- [REQ-1] [Requirement description — specific, testable, unambiguous]
- [REQ-2] [Requirement description]
- ...

## Scope

### In Scope
- [What is included in this feature]

### Out of Scope
- [What is explicitly excluded — things that might seem related but are deferred or not needed]

## Acceptance Criteria
These are verified during manual testing (step 5 of the workflow). Each must be checked off before the feature is considered complete.
- [ ] [Verifiable criterion tied to REQ-1]
- [ ] [Verifiable criterion tied to REQ-2]
- ...

## Constraints
- [Technical, business, or timeline constraints that affect the solution space]

## Open Questions
[Anything unresolved that must be decided before implementation planning can begin. Remove this section entirely once all questions are resolved — its presence signals that the spec is not ready for implementation planning.]
```

Omit sections that have no content. If there are no constraints or open questions, don't include those sections — don't write "None" in an empty section.

## File Path

Save specifications to: `.claude/plans/[descriptive-feature-name]-spec.md`
