# Table Snap — Implementation & Verification Notes

Spec: `.claude/plans/table-snap-spec.md`
Plan: `.claude/plans/table-snap-plan.md`

## Automated Verification

| Check | Status | Notes |
|---|---|---|
| `npx tsc --noEmit` | ✅ | Project-wide type check clean. |
| `npx eslint` (changed files) | ✅ | No new errors. |
| Snap module unit tests | ✅ | `__tests__/unit/lib/floor-plans-snap.test.ts` — 14 cases covering all 6 reference lines, per-axis independence, ties, threshold-zero, and guide-span correctness. |
| Full project test suite | ✅ | 568 tests pass across 86 files (up from 550 — 14 new snap tests + 4 from earlier polygon work). |

### What unit tests cover

- Edge→edge alignment within threshold returns the correct adjusted centre and a single x-axis guide.
- Independent x and y snaps to two different neighbours produce two guides.
- Canvas-centre snap on both axes when the dragged centre approaches the canvas middle.
- Closer competing target wins on the same axis.
- Right-edge of dragged snapping to left-edge of an adjacent target (any of the 3×3 line pairings).
- Threshold-zero short-circuits to "no snap, no guides".
- Guide spans cover the perpendicular extent of both rectangles (`min(top)…max(bottom)` for x-axis guides).
- `guidesEqual` value-equality helper handles all relevant cases (identical refs, equal arrays, length differences, field differences, null pairings).

## Acceptance Criteria

UI-level criteria need an in-browser pass; this environment doesn't have a browser-driver installed.

| # | Criterion | Verified |
|---|---|---|
| 1 | Edge↔edge snap with ~6px threshold + horizontal guide | ⏳ manual (math is unit-tested) |
| 2 | Centre↔canvas-centre snap on each axis | ⏳ manual (math is unit-tested) |
| 3 | Centre↔centre snap between two tables | ⏳ manual (math is unit-tested) |
| 4 | Alt-hold → no snap, no guides | ⏳ manual |
| 5 | Release Alt mid-drag re-engages snap | ⏳ manual |
| 6 | Tables in other rooms don't influence snap | ⏳ manual (canvas filters by `tablesInRoom`) |
| 7 | Labels are not snap targets | ⏳ manual (canvas only feeds tables to `computeTableSnap`) |
| 8 | Canvas-rect clamp wins over snap (no out-of-canvas placement) | ⏳ manual (clamp wraps the snap result in dragBoundFunc) |
| 9 | Arrow-key nudge does not snap | ⏳ manual (`nudgeSelected` does not call `computeTableSnap`) |
| 10 | Smart guides disappear when drag ends | ⏳ manual (`onDragEnd` clears `snapGuides`) |
| 11 | Closer of two same-axis targets wins | ✅ unit-tested |

## Implementation Summary

5 commits on `main`:

1. `feat(floor-plan): pure snap module + spec/plan` — `snap.ts` + 14 unit tests + spec/plan files.
2. `feat(floor-plan): wire computeTableSnap into table drag` — dragBoundFunc integration with reference-equality short-circuit.
3. `feat(floor-plan): render smart guides while snap is engaged` — `DragSnapGuidesLayer` Konva component.
4. `feat(floor-plan): Alt-key suppresses table snap` — window listeners, ref-based read inside dragBoundFunc.
5. (this file) — verification notes.

Out-of-scope items (deferred per spec):
- Equal-spacing distribution snap.
- Snap to labels or polygon outlines.
- Snap during arrow-key nudge.
- Snap-to-grid.
- Persisted per-user snap toggle.
- Non-axis-aligned snap (lands with the future arbitrary-rotation feature).

## Manual Verification Plan

1. `npm run dev`, log in as a convention organizer (e.g. `magicon@conaro.test` / `seed-pass-123`).
2. Open `/conventions/manage/events/<id>/floor-plan` for an event with at least 3 seeded tables.
3. Make sure you're in **Populate** mode.
4. Drag a table near a neighbour's left edge — confirm a vertical purple dashed guide appears at the moment of snap and the table jumps into alignment. Same for right/top/bottom and centres.
5. Drag toward the canvas centre — both axis guides should engage when within ~6px.
6. Hold Alt before clicking a table → drag → no guides, table follows cursor freely. Release Alt mid-drag and continue dragging — snap re-engages on next move.
7. Switch to a different room (if multi-room) and drag a table — no guides come from the other room's tables.
8. Drag a table in a room with labels nearby — labels do not produce guides.
9. Drag toward and past the canvas edge — table stops at the edge, never goes outside; snap may engage on the canvas edge first.
10. Click a table to select it and use arrow keys to nudge — confirm no guides appear during nudging.
