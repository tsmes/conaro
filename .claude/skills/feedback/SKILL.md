---
name: feedback
description: Present completed work to the user, gather structured feedback, and translate it into actionable next steps.
version: 1.0.0
---

# Feedback

Present completed work to the user and gather their feedback. The goal is to give the user a clear picture of what was built, surface anything they should know, and capture their response in a way that drives the next action.

## Principles

- Present facts, not sales pitches. The user wants to know what works, what doesn't, and what's left — not how great the implementation is.
- Make it easy to respond. Structure the presentation so the user can quickly say "looks good", point to a specific issue, or ask for changes.
- Capture feedback precisely. Vague feedback like "make it better" should be clarified into specific, actionable items before proceeding.
- Separate what's done from what's known-incomplete. Don't hide limitations — surface them explicitly so the user can make informed decisions.

## Workflow

1. **Gather context** → Read the plan, test results, and review findings. Use `empty-agent` sub-agents if needed to quickly summarize the current state of the implementation.
2. **Present** → Show the user a structured summary of what was implemented (see Presentation Format below).
3. **Ask** → Explicitly ask the user for feedback. Don't assume silence is approval.
4. **Capture** → Record their feedback. If feedback is vague or ambiguous, ask clarifying questions until each item is specific enough to act on.
5. **Translate** → Convert feedback into concrete next steps. Determine whether each item is a bug fix, a change request, a new requirement, or out of scope. Present the plan back to the user for confirmation before acting.

## Presentation Format

```markdown
## What was built

[1-3 sentences describing the feature and what it does from the user's perspective]

## What changed

- [File or area]: [what was added/modified and why]
- [File or area]: [what was added/modified and why]

## How to try it

[Brief instructions for the user to see/use the feature themselves — URL, command, steps]

## Test results

[Summary from test report: X passed, Y failed. Link to full report if it exists.]

## Known limitations

- [Anything that's intentionally not covered, deferred, or incomplete]
- [Edge cases not handled]
- [Dependencies on things that don't exist yet]

## Open questions

- [Anything where you made a judgment call the user should validate]
- [Decisions that could reasonably go either way]
```

Omit sections that have no content. If there are no known limitations, don't include the section — don't write "None" in an empty section.

## Handling Feedback

When the user responds, categorize each piece of feedback:

| Type                              | Action                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| Bug / something broken            | → Switch to implement mode, fix it, re-test                |
| Change to existing work           | → Clarify scope, update the plan, switch to implement mode |
| New requirement / scope expansion | → Switch to plan mode to discuss before implementing       |
| Cosmetic / nice-to-have           | → Ask the user if they want it now or later                |
| Approval / looks good             | → Mark the feature as complete in the plan                 |

If feedback contains multiple items, confirm the priority order with the user before starting work.

## What Not to Do

- Don't defend implementation choices. If the user wants something different, clarify what they want and do it.
- Don't ask "is there anything else?" open-endedly. Ask about specific areas: "Does the error handling match what you expected?" or "Is the response format right?"
- Don't conflate feedback with review. Review is about code quality standards. Feedback is about whether the feature meets the user's needs.
- Don't proceed to new work without explicit user sign-off on the current feature.
