---
name: document
description: Document code, features, or systems in a clear and concise manner.
version: 1.0.0
---

# Documentation

Write accurate, minimal documentation that serves a specific audience. Focus on what the code doesn't already communicate — the why, the connections, and the non-obvious decisions.

## Principles for Effective Documentation

- Don't document what the code already says. If a function name, type signature, or structure makes behavior obvious, documentation should explain why it exists and how it connects to the larger system — not restate what it does.
- Accuracy over completeness. A shorter document that's correct is more valuable than a comprehensive one that's partly wrong or will rot when the code changes.
- Every sentence should earn its place. If removing a sentence doesn't lose information for the target audience, remove it.
- Documentation should be maintainable. Document interfaces and intent, not internal mechanics. Avoid coupling docs to implementation details that change frequently.
- Match existing documentation conventions in the project before imposing new structure.
- Never add structural sections that contain only a single sentence. If a section has nothing substantive to say, omit it.

## Context Gathering

Always start by gathering context about the codebase, project conventions and architecture (particularly architecture decision records, ADR, if present).
First, read CLAUDE.md, CONTRIBUTING.md, README.md and do a high level scan to identify other relevant documentation files.

Gather only the context needed to write accurate documentation. Avoid broad reads of the codebase — instead, use the `empty-agent` sub-agent with specific instructions to investigate targeted files, modules, or patterns as needed. Launch multiple sub-agents in parallel when investigating independent areas. For each sub-agent, provide a detailed ad-hoc prompt and clearly outline output format expectations to get only the information you need.

Pay attention to existing documentation structure, tone, and conventions. New documentation should feel like it belongs alongside what's already there.

## Workflow

1. **Gather Context** → Read project docs and identify existing documentation conventions. Use parallel `empty-agent` sub-agents to investigate the code, modules, or features that will be documented.
2. **Clarify** → The user must define what to document and who the audience is. If either is missing, ask before proceeding. Determine the appropriate documentation type (see Documentation Types below) from the request and existing conventions. Only ask questions whose answers would materially change the documentation — avoid exhaustive questioning.
3. **Investigate** → Launch parallel `empty-agent` sub-agents to deeply read the code being documented. Each sub-agent should focus on a specific module or aspect and return structured findings: what it does, how it connects to other parts, and what the non-obvious decisions or behaviors are. This is where depth of understanding is built — the quality of the documentation depends on the quality of this investigation.
4. **Draft** → Write the documentation following project conventions for structure, placement, and tone. Apply the principles above ruthlessly — cut anything the code already communicates or that the target audience wouldn't need.
5. **Validate** → Launch a `empty-agent` sub-agent to verify the drafted documentation against the actual code. The validation prompt should check: do described behaviors match the implementation, are code examples correct and runnable, are file paths and references accurate, is anything claimed that isn't true. Fix discrepancies before presenting.
6. **Present** → Show the documentation to the user with a brief note on what was documented, what assumptions were made, and where the documentation was placed.

Steps are not strictly linear. If investigation (3) reveals that the scope is larger or different than expected, return to Clarify (2). If validation (5) finds inaccuracies, return to Investigate (3) for the specific area before redrafting.

## Documentation Types

Determine the appropriate type from the user's request and existing project conventions. Common types:

- **Feature documentation** — what a feature does, why it exists, how it's used. Audience: developers working with or around the feature.
- **API reference** — endpoints, parameters, responses, error cases. Audience: consumers of the API.
- **Architecture overview** — system structure, module relationships, key decisions. Audience: developers onboarding or making cross-cutting changes.
- **How-to guide** — task-oriented, step-by-step instructions for achieving a specific outcome. Audience: developers performing the task.
- **Code tour** — guided walkthrough of a feature's execution path, from entry point through key decision points. Audience: developers who need to understand or modify the feature.
- **README / CONTRIBUTING** — project setup, contribution guidelines, getting started. Audience: new contributors.

These are not rigid templates. Let the content dictate the structure — if a feature is simple, a few paragraphs may be more appropriate than a multi-section document.

## What to Guard Against

**Restating the obvious**

- Documenting that `getUserById(id)` "gets a user by ID"
- Describing function parameters that are already clear from their names and types
- Adding "Overview" sections that just restate the document title

**Implementation coupling**

- Describing internal data structures, private methods, or implementation details that aren't part of the public interface
- Documenting step-by-step internal flows that will break when the implementation changes
- Referencing line numbers or internal variable names

**Stale or incorrect examples**

- Code snippets that don't match the current API
- Import paths that don't exist
- Examples that would fail if actually run

**Structural bloat**

- Adding sections with one sentence just to have the section
- Including a table of contents for a short document
- Creating separate files for content that fits in an existing document

**Audience mismatch**

- Explaining basic language concepts to experienced developers
- Using deep domain jargon in onboarding documentation
- Documenting internal details in user-facing docs

## File Placement

Follow existing project conventions for documentation placement. If no convention exists, use:

- Feature docs: `[repo]/docs/[feature-name].md`
- API reference: `[repo]/docs/api/[resource-name].md`
- Architecture: `[repo]/docs/architecture/[topic].md`
- How-to guides: `[repo]/docs/how-to/[task-name].md`
- Code tours: `[repo]/docs/tours/[feature-name].md`

Always check if the documentation belongs in or near an existing file before creating a new one.
