# Implementation Plan: Table-to-Table Alignment Snap

Spec: `.claude/plans/table-snap-spec.md`

## Technical Decisions

- **New `src/lib/floor-plans/snap.ts` module**: pure functions for snap math, separate from `geometry.ts` (polygon-specific). Single export `computeTableSnap` returning the adjusted centre and the engaged guide list.
- **Integration point: `dragBoundFunc` on the table Group**: extends today's centre-clamp pipeline. Snap result is post-processed by the existing canvas-rect clamp so REQ-9 holds without extra wiring.
- **Snap state in the canvas**: `useState<SnapGuide[] | null>` — `null` when not dragging or when Alt is held. Updated from `dragBoundFunc` with reference-equality short-circuit; cleared on `onDragEnd`.
- **Alt tracked via `useRef<boolean>`**: window `keydown`/`keyup` attached at drag start, detached at drag end. Read inside `dragBoundFunc`; avoids re-render churn for modifier state.
- **Guide rendering**: new `<DragSnapGuidesLayer>` Konva layer mounted when `guides !== null && !alt`. One `Konva.Line` per guide in the primary colour.
- **Snap threshold**: 6 screen pixels (REQ-3); converted to cm per tick via `thresholdCm = SNAP_THRESHOLD_PX / scale`.

## Tasks

### 1. Pure snap module + unit tests
The math: collect all reference lines from neighbours and the canvas, find the closest within threshold per axis, return the adjusted centre and the guide endpoints.

**Requirements:** REQ-2, REQ-3, REQ-7, REQ-8 (math); infrastructure for the rest.

**Files:**
- `src/lib/floor-plans/snap.ts` — new module exporting `computeTableSnap` and types.
- `__tests__/unit/lib/floor-plans-snap.test.ts` — new file.

**Approach:**
- Define types:
  ```ts
  type SnapGuide = {
    axis: "x" | "y";
    positionCm: number;       // constant axis value
    spanFromCm: number;       // extent along perpendicular axis
    spanToCm: number;
  };

  type SnapTarget = {
    leftCm: number; rightCm: number; topCm: number; bottomCm: number;
    centerXCm: number; centerYCm: number;
  };

  interface ComputeTableSnapArgs {
    proposedCenter: Point;          // cm
    halfWidthCm: number;
    halfDepthCm: number;
    others: SnapTarget[];           // siblings in active room (post-rotation effective extents)
    canvas: { widthCm: number; heightCm: number };
    thresholdCm: number;
  }

  interface ComputeTableSnapResult {
    adjustedCenter: Point;
    guides: SnapGuide[];
  }
  ```
- Algorithm per axis (x and y are independent):
  1. Compute the dragged table's six lines (left/right/centre on x; top/bottom/centre on y) at the proposed centre.
  2. Build the target line list: from each `other`, contribute its left/right/centerX (for x) and top/bottom/centerY (for y); plus canvas 0/widthCm/centre on x and 0/heightCm/centre on y.
  3. For each of the dragged table's three lines on this axis, find the target line minimising `|draggedLine - targetLine|`. If that minimum ≤ thresholdCm, record (draggedLine, targetLine, delta).
  4. Across the three candidate snaps, pick the one with smallest |delta|. That's the engaged snap for the axis.
  5. Apply `delta` to the centre on this axis. Build a guide with `positionCm = targetLine`, span = the bounding extents of the dragged table and the target source along the perpendicular axis (so the guide line spans both rectangles).
- Edge cases:
  - No others + canvas only → still computes canvas snaps.
  - Empty `others` and threshold=0 → returns proposed centre, `guides: []`.
  - When the dragged centre matches a target exactly → delta = 0, still emit a guide so the user sees the alignment.
- Tests (red first):
  - Aligns left edge to left edge of a single neighbour within threshold; centre returns adjusted; one x-axis guide.
  - Independent x and y snap to different neighbours simultaneously → 2 guides.
  - Snap to canvas centre on both axes when proposed centre is near canvas centre.
  - Returns proposed centre unchanged when no target within threshold.
  - When two targets are equally distant on the same axis, the chosen guide's positionCm equals the closer target (or the first encountered for ties).
  - When dragged table's right edge is closer to a target's left edge than its left edge is to anything → snap engages on right→left.

**Verification:** `npm test -- floor-plans-snap` — all cases pass.

**Depends on:** none.

### 2. Wire snap into table dragBoundFunc + canvas state
Connect the pure snap module to the live drag.

**Requirements:** REQ-1, REQ-2, REQ-3, REQ-6, REQ-7, REQ-8, REQ-9, REQ-10

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx` — modify the table Group's `dragBoundFunc`, add `useState` for guides, clear on `onDragEnd`.

**Approach:**
- Add `const [snapGuides, setSnapGuides] = useState<SnapGuide[] | null>(null)` near the top of the component.
- In `dragBoundFunc`, after converting the proposed pos to cm:
  1. Build `others: SnapTarget[]` from `tablesInRoom` excluding the dragged table id, accounting for rotation (use the same `effWidthCm` / `effDepthCm` math already present).
  2. Call `computeTableSnap(...)` with the active room's `widthCm`/`heightCm` as the canvas, `thresholdCm = 6 / scale`.
  3. Use `result.adjustedCenter` for the px conversion and the existing canvas-rect clamp.
  4. Update `setSnapGuides(prev => sameGuides(prev, result.guides) ? prev : result.guides)`.
- Add a small `sameGuides(a, b)` helper inline (compare lengths + each guide's axis/position/spans) to avoid render thrash.
- In the table Group's `onDragEnd`, after the existing `handleTableDragEnd`, call `setSnapGuides(null)`.
- Also call `setSnapGuides(null)` if drag is interrupted: add `onDragCancel` (or use `onMouseLeave` / clear in unmount cleanup).
- Snap is gated to `viewMode === "populate"` since tables are already non-draggable in design mode (REQ-10 satisfied for nudge by not calling snap from `nudgeSelected`).

**Verification:** Manual: drag a table near a neighbour — the table jumps to align. No guide rendering yet. Drag end → no residual side effects.

**Depends on:** 1.

### 3. Render smart guides while snap is engaged
The visible Figma-style alignment lines.

**Requirements:** REQ-4

**Files:**
- `src/components/floor-plans/drag-snap-guides-layer.tsx` — new component.
- `src/components/floor-plans/floor-plan-canvas.tsx` — mount the layer when guides are active.

**Approach:**
- `DragSnapGuidesLayer` is a `react-konva` `<Layer listening={false}>` containing one `<Line>` per guide.
- Props: `guides: SnapGuide[]`, `paddingPx: number`, `scale: number`.
- For each guide, convert cm → stage px. For an x-axis guide (vertical line):
  ```
  x = paddingPx + positionCm * scale
  yStart = paddingPx + spanFromCm * scale
  yEnd = paddingPx + spanToCm * scale
  ```
  And vice versa for y-axis (horizontal line).
- Stroke `#6a37d4` (matches existing `COLORS.edge`), `strokeWidth: 1`, `opacity: 0.85`, `dash: [4, 4]`.
- Mount inside the canvas's Stage after the tables Layer (so guides render on top): `{snapGuides && !altPressedRef.current && <DragSnapGuidesLayer ... />}`. (altPressedRef integration arrives in Task 4 — until then guides render whenever `snapGuides` is set.)

**Verification:** Manual: drag a table → guide lines appear on engaged axes; disappear on drag end.

**Depends on:** 2.

### 4. Alt-key suppression of snap
Holding Alt during drag disables snap and hides guides.

**Requirements:** REQ-5

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx` — add ref, attach/detach key listeners around drag.

**Approach:**
- Add `const altPressedRef = useRef(false)` near the existing refs.
- On the table Group's `onDragStart`:
  - Set up window keydown/keyup listeners that toggle `altPressedRef.current` on `e.key === "Alt"`.
  - Store the listener handles in a ref so the same handlers can be removed on drag end.
- On `onDragEnd`: remove the listeners; reset `altPressedRef.current = false`; clear guides (already done in Task 2).
- In `dragBoundFunc`, before calling `computeTableSnap`:
  - If `altPressedRef.current`, skip the snap call entirely. Return `proposedCenter` (after canvas-rect clamp). Also `setSnapGuides(null)` so the layer hides.
- The guides layer mount condition becomes `{snapGuides && !altPressedRef.current && ...}`. Since `altPressedRef.current` change doesn't trigger re-render, we already cleared `snapGuides` to `null` when Alt is pressed mid-drag; the layer hides via the `null` check. (Reading the ref in the JSX is OK but redundant — keep just `snapGuides &&` for clarity once Task 2's clear-on-Alt is in place.)
- Subtle: when Alt is held at drag start, the keydown listener may not have fired yet (the user has been holding Alt before mousedown). Capture initial state from `e.evt.altKey` in `onDragStart`.

**Verification:** Manual:
- Hold Alt then start drag — table moves freely, no guides.
- Start drag without Alt, get a guide engaged, then press Alt — guide disappears, table follows cursor.
- Release Alt — snap and guides re-engage on next move.

**Depends on:** 2, 3.

### 5. Manual verification + spec sign-off
Walk through the acceptance criteria.

**Requirements:** All

**Files:**
- `.claude/plans/table-snap-spec.md` — check off acceptance criteria.
- `.claude/plans/table-snap-test-results.md` — new file recording results.

**Approach:**
- `npm run dev`, log in as a convention organizer, navigate to `/conventions/manage/events/<id>/floor-plan` for a Magicon (or other) event with at least 3 tables.
- Walk through each acceptance criterion in the spec; check the box and note any deviations.
- For arrow-key nudge (REQ-10), confirm no guides appear during nudge.

**Verification:** All boxes checked or deviations recorded.

**Depends on:** 1, 2, 3, 4.

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (snap during drag) | 2 |
| REQ-2 (6 reference lines per table + canvas) | 1, 2 |
| REQ-3 (~6px screen threshold, closest wins) | 1, 2 |
| REQ-4 (smart guides) | 3 |
| REQ-5 (Alt suppresses snap + guides) | 4 |
| REQ-6 (active-room only) | 2 |
| REQ-7 (labels excluded) | 1, 2 |
| REQ-8 (per-axis independent) | 1 |
| REQ-9 (canvas-rect clamp wins) | 2 |
| REQ-10 (drag-only) | 2 |

## Risks

- **State updates per drag tick**: `setSnapGuides` fires up to ~60 Hz. The reference-equality short-circuit covers the common case (guide list unchanged), but rapid changes could still cause noticeable React work on slower machines. If profiling shows it's hot, switch to a `useRef` + `Konva.Layer.batchDraw()` and skip React entirely for guide updates.
- **Alt-key timing**: window keydown only fires while focus is in the document body. If the user clicks the canvas, then a panel takes focus, then drags, Alt presses might not be captured. Capturing the initial `e.evt.altKey` in `onDragStart` mitigates the at-start case; mid-drag Alt should always work because the canvas has focus during drag.
- **Snap targets across rotation**: today's table rotation is axis-aligned (0/90/180/270), so `effWidthCm` / `effDepthCm` give us the bounding box in canvas space. The arbitrary-rotation feature will need to revisit how snap targets are computed for rotated rects (oriented bounding boxes intersecting axis-aligned guide lines) — out of scope here.
- **Guides for very short alignments**: if two tables share an aligned edge but their perpendicular extents don't overlap (e.g. one's far left and below, the other far right and above), the guide line might draw across a long stretch. The "span between the two reference points" formula picks `spanFrom = min(draggedExtent, targetExtent)` and `spanTo = max(...)` so the line covers both rectangles' relevant extents — visually clear enough.
