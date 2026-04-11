---
name: review-ts-react
description: Review code changes, pull requests, or diffs in React/TypeScript codebases. Use for PR reviews, checking completed features, or verifying code quality before merge.
version: 1.0.0
---

# Review — TypeScript / React

Perform a code review following the determined rules and approaches outlined below.

## Your Task

Conduct a code review using the guidelines provided in this document. Identify critical issues, important concerns, and suggestions for improvement in the codebase.

The "What to Look For" section below is a reference catalog, not a checklist. Only report findings that are genuinely problematic in context.

Utilize the `empty-agent` sub-agent with custom, detailed, ad-hoc prompt instructions to parallelize review and context gathering as you see fit. Always use these agents in order to reduce context use, improve focus, and speed up the review process by parallelizing tasks.

## Context Gathering

Always start by gathering context about the codebase, project conventions and architecture (particularly architecture decision records, ADR, if present).
First, read CLAUDE.md, CONTRIBUTING.md, README.md and do a high level scan to identify other relevant documentation files.

Gather only the context needed to understand the changes under review. Avoid broad reads of the codebase — instead, use the `empty-agent` sub-agent with specific instructions to investigate targeted files, modules, or patterns as needed. Be sure to clearly outline output format expectations to get only the information you need.

## Scope Definition

Identify scope of the review based on instructions from the user, and keep the review focused only on that scope.

If no explicit scope is provided, determine what to review using these commands:

1. **Check current state:** `git status`
   - Shows uncommitted changes (staged and unstaged)
   - Shows untracked files

2. **If there are uncommitted changes:** `git diff`
   - Reviews all unstaged modifications
   - Add `--staged` to include staged changes: `git diff --staged`

3. **If no uncommitted changes, review branch against main:** `git diff main...HEAD`
   - Shows all changes on the current branch since it diverged from main
   - Use this for PR reviews or completed feature branches

## Principles for maintainable code

- Always implement the minimal solution that meets the requirements. Never add features, optimize or generalize prematurely.
- A feature should not be more complex than necessary to meet the requirements.
- A feature should not introduce instability by touching unrelated parts of the codebase.
- Code should be optimized for readability over cleverness.
- New code should match existing codebase patterns and conventions.
- Each unit of code (function, component, hook) should have a single, clear responsibility.
- Prefer explicit, self-documenting code over implicit behavior.

## What to Look For

### Critical (Blockers)

**Type safety violations**

- Use of `any` type or workarounds like `Record<string, any>`
- Unsafe type assertions (`as Type`) that bypass type checking instead of fixing the underlying type issue
- Missing null/undefined checks where types indicate values could be absent

**Silent error handling**

- Empty catch blocks that swallow errors without logging or handling
- Try/catch that catches but doesn't rethrow, log, or notify the user
- Promises without `.catch()` or surrounding try/catch in async functions

**React hook rule violations**

- Hooks called inside conditionals (`if`, `switch`, ternaries)
- Hooks called inside loops (`for`, `while`, `.map()` callbacks)
- Hooks called after early returns
- Hooks called inside nested functions or callbacks
- Missing or incorrect dependency arrays in `useEffect`, `useMemo`, `useCallback` leading to stale closures or infinite loops

**State management violations**

- Using `useEffect` to sync state that could be computed directly during render
- Storing derived data in state instead of computing it from source state
- Manual state synchronization between multiple state variables that should be a single source of truth

**Security concerns**

- Using `dangerouslySetInnerHTML` with unsanitized user input
- Rendering user-controlled content without escaping (XSS vectors)
- Storing secrets, API keys, or tokens in client-side code or environment variables prefixed with `NEXT_PUBLIC_` / `VITE_`
- Building URLs or query strings from user input without proper encoding
- Disabling CORS, CSP, or other security headers without justification

### Important

**YAGNI violations (You Aren't Gonna Need It)**

- Code implementing features or options not currently required
- Generic/configurable solutions when a specific implementation would suffice
- Abstractions created for a single use case "in case we need it later"
- Props or parameters added for hypothetical future flexibility
- Multiple code paths where only one is currently used

**Excessive cyclomatic complexity**

- Functions with many conditional branches (if/else chains, switch statements with many cases)
- Deeply nested conditionals (more than 2-3 levels)
- Complex boolean expressions that are hard to parse mentally
- Functions where you can't easily trace all execution paths
- Single functions handling multiple distinct scenarios that should be separate functions

**Unnecessary complexity (could be simpler)**

- Deep nesting where early returns would flatten the logic
- Ternary operators nested more than one level
- Indirection that doesn't add value (wrapper functions, pass-through components)
- Overly clever code that requires mental gymnastics to understand
- Abstractions that obscure rather than clarify intent

**Missing reuse of obviously shared code**

- Copy-pasted logic that appears in multiple places with minor variations
- Repeated patterns that should be extracted to a shared utility or hook
- Multiple components with identical behavior that should share implementation

**Premature or unnecessary abstractions**

- Utility functions or hooks created for single use
- Generic components when a specific component would be clearer
- Layers of indirection that don't provide clear benefit
- Configuration objects or options that only have one possible value

**Naming and clarity issues**

- Abbreviated names that aren't immediately obvious (`usr`, `val`, `tmp`)
- Magic values (hardcoded numbers, strings) without named constants
- Names that don't reflect what the thing actually does
- Boolean variables or props without clear yes/no meaning

**Component structure issues**

- Components with too many props suggesting the component should be split
- Wrapper components that only pass props through without adding behavior
- Business logic directly in component body instead of custom hooks or utilities
- Components doing multiple unrelated things (violating single responsibility)

**Code hygiene**

- Commented-out code left in the codebase
- Console.log statements left from debugging
- Unused imports, variables, or functions
- Dead code paths that can never execute

### Suggestions

**Colocation opportunities**

- Types defined far from where they're used that could be moved closer
- Hooks in separate files that are only used by one component
- Related utilities scattered across files that belong together

**Custom hook extraction opportunities**

- Logic in components that could be cleaner as a named custom hook
- Related state and effects that could be grouped into a single hook
- Repeated patterns across components that could become a shared hook

**Composition improvements**

- Large components that could be broken into smaller, focused pieces
- Props being drilled through multiple layers that might benefit from composition patterns
- Conditional rendering that could be clearer with component composition

**Minor naming improvements**

- Names that are correct but could be more precise
- Inconsistent naming patterns within the same file or feature

## Your Workflow

1. Gather context about the codebase and project conventions as needed. Use the `empty-agent` sub-agent with specific instructions to retrieve relevant information.
2. Identify the scope of the review based on user instructions or uncommitted changes.
3. Launch parallel `empty-agent` sub-agents with detailed, ad-hoc prompts to analyze different parts of the code changes according to the "What to Look For" section.
4. Collect findings from all sub-agents.
5. Consider pragmatically whether the findings warrant changes based on severity and impact, and realistically whether they matter to the feature being developed at this time.
6. Compile a structured review report following the output format below.

If analysis reveals insufficient context to assess a finding (e.g., unclear whether a pattern is intentional), return to step 1 to gather targeted context before including the finding.

## Output Format

### Summary Section

Begin with a brief summary (2-4 sentences) that answers:

- What was reviewed (scope)
- Overall impression of code quality
- Count of findings by severity (e.g., "Found 2 critical issues, 3 important concerns, and 1 suggestion")

### Findings Section

List findings grouped by severity. For each finding include:

```
**[Severity] - [Short description]**
File: `path/to/file.tsx:lineNumber`
Issue: [Clear explanation of what's wrong and why it matters]
Suggestion: [Concrete fix or approach to resolve]
```

Order findings: Critical first, then Important, then Suggestions.

If no findings in a severity category, omit that category entirely.

### Verdict Section

End with one of the following verdicts:

- **Approve** - No critical issues, code is ready to merge
- **Approve with suggestions** - No critical issues, minor improvements recommended but not required
- **Request changes** - Critical or important issues must be addressed before merge
