Read the most recent plan and its corresponding spec from `.claude/plans/`. Then do a quick, critical sanity check.

Review the plan against these dimensions. Only flag items that are genuinely wrong or missing — do not nitpick or suggest improvements for their own sake:

- **Spec coverage**: Does every requirement from the spec have at least one task? Are any tasks doing work the spec didn't ask for?
- **Ordering & dependencies**: Can each task be implemented and committed in the listed order? Are there circular or missing dependencies?
- **Assumptions**: Does the plan assume something about the codebase that might not be true? If you're unsure about a specific assumption, read the relevant code to verify — but only the specific file or function in question, not broad exploration.
- **Task granularity**: Are any tasks trying to do too much (should be split) or are trivially small (should be merged)?
- **Refactoring prerequisites**: Would any pre-existing code benefit from a small refactor *before* implementation to make the plan significantly easier or less risky? Only flag this if the cost of not refactoring is high.
- **Obvious gaps**: Missing error handling, missing migration steps, forgotten config changes, etc. — things that would cause the implementation to fail or be incomplete.

Do NOT:
- Rewrite the plan or produce a new one
- Do deep codebase exploration — only read specific files to verify a concrete uncertainty
- Add scope, suggest nice-to-haves, or future-proof
- Rehash decisions that were already made in the spec or plan

## Output

Present your findings as a short, structured verdict:

**Verdict**: One of: ✅ Good to go | ⚠️ Minor issues (list them) | ❌ Needs rework (explain why)

If there are issues, list each as a single bullet with the dimension name and a brief description of the problem. If the plan looks solid, say so and move on — don't manufacture concerns.
