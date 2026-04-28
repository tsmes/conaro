# Implementation Plan: Polygon-shaped Rooms in the Floor Planner

Spec: `.claude/plans/polygon-rooms-spec.md`

## Technical Decisions

- **Schema shape**: `FloorPlanRoom.vertices?: { xCm: number; yCm: number }[]` — optional, room-local coordinates (canvas top-left = `(0, 0)`), same convention tables/labels already use. Object form (not tuples) for readability. Absent / empty array → render and clamp as the canvas rect (no migration).
- **View mode state**: `viewMode: "design" | "populate"` is local React state in `FloorPlanEditor`, defaults to `"populate"`. Toggled via a button group rendered above the canvas. Not URL-bound — keeps the editor as a self-contained stateful workspace.
- **Canvas evolution**: Single `floor-plan-canvas.tsx` accepts a new `viewMode` prop. Polygon drawing/editing UI lives in a new `<PolygonEditorLayer>` (4th Konva layer) that's mounted only when `viewMode === "design"`. Stage / pan / zoom / measurement infrastructure stays unified.
- **Pan/zoom enabling**: Today gated by `!editable`. New rule: enabled when `!editable || viewMode === "design"`. Drag-pan suppresses when the click target is a vertex / edge to avoid stealing vertex-drag interactions.
- **Edge length popup**: HTML overlay (absolute-positioned div with `<input type="number">`) anchored near the clicked edge midpoint in screen space. Native form behaviour beats fighting Konva text input.
- **New geometry module**: `src/lib/floor-plans/geometry.ts` — pure functions only (no React). Used by canvas, table-clamp logic, and edge-length resize. Unit-tested in isolation.
- **Persistence**: vertex edits flow through the existing `onChange(plan)` → debounced 500ms `saveFloorPlan` chain. Server-side validation extends `roomSchema` in `floor-plan-actions.ts` with an optional `vertices` array (min 3 when present, max 24, integer coordinates within the existing 0–10000 cm bounds).
- **Sidebar visibility**: hidden when `viewMode === "design"`. Polygon-specific controls (Clear polygon, status hint) live in the design-mode toolbar.
- **Konva room-frame rendering**: replace the single fill-and-stroke `<Rect>` (lines 426–435 of `floor-plan-canvas.tsx`) with a polygon-aware render — `Konva.Line` (closed) when `vertices` exist, else today's rounded `<Rect>`. Affects every consumer (populate, design, public) consistently.

## Tasks

### 1. Extend schema and Zod validation for `vertices` ✅
Add an optional polygon-vertex array to the room data model and accept it in the save action's Zod schema.

**Requirements:** REQ-4, REQ-15

**Files:**
- `src/lib/db/schema/events.ts` — extend `FloorPlanRoom` with `vertices?: { xCm: number; yCm: number }[]`. Add a short comment that absent/empty `vertices` means "use the canvas rect as the room outline".
- `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/actions.ts` — extend `roomSchema` with an optional `vertices` array (`z.array(z.object({ xCm: z.number().int().min(0).max(10000), yCm: z.number().int().min(0).max(10000) })).min(3).max(24).optional()`). No business-logic changes (still validate within `saveFloorPlan`).
- `src/lib/floor-plans/queries.ts` — `migrateLegacyPlan` passes `vertices` through unchanged. Add a one-line note in the function's existing comment.
- `__tests__/integration/floor-plan-save.test.ts` — add cases:
  - Valid polygon (4 vertices) saves successfully.
  - Polygon with 2 vertices is rejected.
  - Polygon with NaN / negative / > 10000 coordinates is rejected.
  - A room without `vertices` saves identically to today.

**Approach:**
- The Zod constraint mirrors the existing x/y constraints on tables for consistency.
- Keep the type optional and leave `widthCm` / `heightCm` required — the canvas rect is still the primary scale reference.
- No DB migration: `floor_plan` is JSONB; new shape just appears alongside existing data.

**Verification:** `npm test -- floor-plan-save floor-plan-schema`. Existing tests must still pass; new cases pass.

**Depends on:** none

### 2. Geometry utility module ✅
Pure functions used by the design canvas, table clamping, and edge resize.

**Requirements:** REQ-8, REQ-9, REQ-10, REQ-13 (infrastructure)

**Files:**
- `src/lib/floor-plans/geometry.ts` — exports:
  - `pointInPolygon(point: Point, polygon: Point[]): boolean` — ray-casting, half-open inclusion to avoid edge double-counting.
  - `snapToAxis(prev: Point, candidate: Point, toleranceDeg = 5): Point` — if `candidate` is within `toleranceDeg` of horizontal/vertical from `prev`, projects onto the axis; else returns `candidate`.
  - `snapToVertex(candidate: Point, vertices: Point[], thresholdCm: number): Point | null` — returns the snap target (or `null`); caller decides what to do. Threshold is in cm so callers convert from screen-px using current scale.
  - `resizeEdge(polygon: Point[], edgeIndex: number, newLengthCm: number): Point[]` — returns a new polygon where edge `[edgeIndex, edgeIndex + 1]` has length `newLengthCm`, with `polygon[edgeIndex]` anchored and `polygon[edgeIndex + 1]` moved along the edge's existing direction.
- `__tests__/unit/lib/floor-plans/geometry.test.ts` — coverage:
  - `pointInPolygon`: convex (rect) inside / outside, concave (L-shape) inside the notch / outside the notch, point on edge.
  - `snapToAxis`: angle within tolerance → snaps; outside tolerance → unchanged; exactly horizontal/vertical → unchanged.
  - `snapToVertex`: within threshold → returns matched vertex; outside → null; equidistant ties → returns the first match.
  - `resizeEdge`: shrinks correctly, grows correctly, preserves direction when edge is non-axis-aligned, returns a fresh array (no mutation).

**Approach:**
- Keep types narrow: `interface Point { xCm: number; yCm: number }` exported from the module so callers don't redeclare.
- All functions are deterministic, side-effect-free.

**Verification:** `npm test -- geometry`. All cases pass.

**Depends on:** none

### 3. View-mode toggle in `FloorPlanEditor` ✅
Introduce the Design / Populate switch and wire it to the sidebar's visibility. The canvas is unchanged at this point — the toggle is UI-only.

**Requirements:** REQ-5

**Files:**
- `src/components/floor-plans/floor-plan-editor.tsx`:
  - Add `useState<"design" | "populate">("populate")` near the existing `activeRoomId` state.
  - Render a small two-button group (e.g. shadcn `Tabs` or a simple segmented control) above the canvas, just inside the existing wrapper div. Labels: "Design", "Populate".
  - Conditionally render `<FloorPlanSidebar>`: only when `viewMode === "populate"`.
  - When `viewMode === "design"`, the canvas takes full width (the sidebar's grid column collapses).
- (No new component file in this task — the toggle is inline; promote to a separate file later if it grows.)

**Approach:**
- Reuse the existing `Segmented` or `Tabs` primitive in `src/components/ui/` if one exists; else inline two `<Button variant="outline">` items.
- The grid layout that holds canvas + sidebar today is in the editor; conditional sidebar rendering is straightforward.

**Verification:** Manual: toggle hides/shows sidebar; canvas remains functional in both modes; no console errors.

**Depends on:** none

### 4. `viewMode` prop on `FloorPlanCanvas` + pan/zoom in design mode ✅
Pass the mode through to the canvas and let pan/zoom run in design mode (today it's gated by `!editable`).

**Requirements:** REQ-11

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - Add `viewMode: "design" | "populate"` to `FloorPlanCanvasProps` (default to `"populate"` so the public viewer doesn't need to pass it).
  - Replace `panZoomEnabled = !editable` with `panZoomEnabled = !editable || viewMode === "design"`.
  - The existing zoom-toolbar render gate (`panZoomEnabled && !editable`) becomes `panZoomEnabled` so it shows in design mode too.
  - Stage `draggable={panZoomEnabled}`: same line — already correct after the gate change.
- `src/components/floor-plans/floor-plan-canvas-dynamic.tsx` — pass `viewMode` through.
- `src/components/floor-plans/floor-plan-editor.tsx` — pass `viewMode={viewMode}` to the canvas.
- `src/components/floor-plans/public-floor-plan-view.tsx` — passes `viewMode="populate"` (default already covers it; no change needed unless prop is required).

**Approach:**
- Drag-pan needs to NOT trigger when starting on a vertex or edge — handled in Task 6 (PolygonEditorLayer's vertex/edge handlers `cancelBubble = true` to stop the Stage drag).
- Mouse-wheel zoom logic at lines 245–268 needs no change — gate already covers design mode.

**Verification:** Manual: in design mode, mouse wheel zooms, drag pans, on-screen +/- buttons work. In populate mode, behaviour is unchanged. Public view unchanged.

**Depends on:** 3

### 5. Polygon-aware room-frame rendering ✅
Render the polygon outline whenever `vertices` exists, in every mode. The rect rendering becomes the fallback.

**Requirements:** REQ-3, REQ-4, REQ-14

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - Replace the room-frame `<Rect>` (lines 426–435) with a conditional:
    - If `activeRoom.vertices && activeRoom.vertices.length >= 3` → `<Line points={[...flattened]} closed fill={COLORS.roomFill} stroke={COLORS.roomStroke} strokeWidth={1.5} />`. Drop shadow rect uses the polygon's bounding box (already what `roomWidthPx`/`roomHeightPx` give us).
    - Else → today's rounded `<Rect>`.
  - In design mode, additionally render a faint dashed canvas-rect outline (REQ-2) underneath the polygon — a separate `<Rect>` with `dash={[4, 4]}`, `stroke={COLORS.canvasOutline}` (new colour, e.g. `#cbd5e1` at 0.4 opacity), no fill. Always visible in design mode regardless of whether a polygon exists.
  - Grid (`<GridBackground>`) stays rect-based — covers the canvas extents, no clipping (per spec).

**Approach:**
- Konva flattens points as `[x1, y1, x2, y2, ...]` — convert vertices in cm to px (apply `scale + PADDING_PX`).
- The drop shadow already uses `roomWidthPx`/`roomHeightPx` derived from `activeRoom.widthCm`/`heightCm` — that's the canvas rect, which is fine as a shadow even for polygons (visual nuance: the shadow will be slightly larger than the polygon — acceptable).

**Verification:** Manual: existing rect rooms render unchanged in all modes. A room with `vertices` in JSONB (manually inserted via SQL or temporarily seeded) renders as polygon. Public view shows the polygon.

**Depends on:** 1, 4

### 6. `PolygonEditorLayer` scaffold + interactive vertices/edges ✅
New Konva layer rendered only in design mode. Renders existing vertices as draggable Circles and edges as clickable Lines. No drawing flow yet — this task is just the substrate.

**Requirements:** REQ-7, REQ-9 (substrate), REQ-10 (substrate)

**Files:**
- `src/components/floor-plans/polygon-editor-layer.tsx` (new):
  - Props: `vertices: Point[] | null`, `scale: number`, `paddingPx: number`, `onVerticesChange: (next: Point[]) => void`, `onEdgeClick: (edgeIndex: number, midpointScreenPx: { x: number; y: number }) => void`.
  - Renders a Konva `<Layer>` containing:
    - One `<Line>` per edge (clickable, slightly thicker stroke for hit area).
    - One `<Circle>` per vertex (radius 6px, draggable, `cancelBubble = true` on `dragStart` to prevent stage pan).
  - Vertex drag handler: on `dragMove`, no state update (visual handled by Konva); on `dragEnd`, compute new vertex position (px → cm), call `onVerticesChange`.
  - Edge click: compute midpoint in screen space, call `onEdgeClick(index, midpoint)`. The popup itself is wired in Task 9.
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - When `viewMode === "design"`, render `<PolygonEditorLayer>` AFTER the existing layers.
  - Pass `onVerticesChange` (calls `onChange(plan)` with active room's vertices replaced) and `onEdgeClick` (Task 9 wires the popup).

**Approach:**
- Cancel-bubble on vertex drag prevents the Stage from also panning.
- Vertices snap on drag via Task 8 — for now, drag is freeform.
- Layer mounts only when the active room has 3+ vertices (otherwise drawing is in progress / not yet started — Task 7).

**Verification:** Manual: a manually inserted polygon shows draggable vertices and clickable edges. Drag updates the room's vertices and triggers debounced save. Edge click logs midpoint (the popup itself comes in Task 9).

**Depends on:** 1, 5

### 7. Polygon drawing flow ✅
Click points to draw, click first vertex to close, Esc cancels, Backspace removes the last point, rubber-band line from last vertex to cursor.

**Requirements:** REQ-6, REQ-7

**Files:**
- `src/components/floor-plans/polygon-editor-layer.tsx`:
  - Add internal state `inProgressVertices: Point[]` and `cursorCm: Point | null`.
  - When the active room has no `vertices`, the layer is in "draw" sub-mode:
    - `onClick` on the Stage (proxied via prop) appends a vertex.
    - On hover, `cursorCm` updates → rubber-band line from last vertex.
    - When 3+ vertices placed and cursor is within snap distance of vertex 0, highlight vertex 0 with a halo. A click on vertex 0 closes — calls `onVerticesChange(inProgressVertices)`.
  - On Esc → reset `inProgressVertices` (no save). On Backspace → pop last vertex.
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - Forward Stage-level `onMouseMove` and `onClick` to the polygon layer when in design mode and the active room has no vertices.
- `src/components/floor-plans/floor-plan-editor.tsx`:
  - Extend the existing window keydown handler to forward Esc / Backspace into the design canvas (or move the Esc/Backspace handling into the canvas itself if cleaner — the existing handler already gates on input focus).

**Approach:**
- Convert click coords to cm in the canvas (it has scale + padding) before forwarding.
- The "click on vertex 0 closes" is detected in the layer using the same vertex-snap threshold as Task 8 (10 px screen).
- A polygon's `vertices` array is only persisted when the polygon is closed; the in-progress array is local state.

**Verification:** Manual: clicking points draws lines, rubber-band tracks cursor, hovering near vertex 0 highlights it, clicking closes, Esc cancels, Backspace removes last.

**Depends on:** 5, 6

### 8. Snap to axis + snap to vertex during drawing and drag ✅
Wire `geometry.snapToAxis` and `geometry.snapToVertex` into the in-progress segment and vertex drag.

**Requirements:** REQ-8, REQ-9

**Files:**
- `src/components/floor-plans/polygon-editor-layer.tsx`:
  - During drawing, before placing a vertex on click, run `snapToVertex(candidate, allVertices)` first; if no match, run `snapToAxis(prevVertex, candidate)` for in-progress segments.
  - During vertex drag, compute the proposed position, then run the same two snap checks (excluding the dragged vertex from `allVertices`).
  - Render visual snap indicators:
    - Axis lock: a dashed guide line along the locked axis from the previous vertex.
    - Vertex snap: a small highlight on the snap target.

**Approach:**
- Snap thresholds: 5° for axis (constant `AXIS_SNAP_DEG`); 10 px for vertex, converted to cm via `scale` (constant `VERTEX_SNAP_PX`).
- Snap indicators are non-interactive Konva primitives in the same layer.

**Verification:** Manual:
- Draw a 4-vertex rectangle by clicking near corners — segments snap to horizontal/vertical and vertices line up cleanly.
- Drag a vertex near another vertex — the dragged vertex jumps to it.
- Move cursor exactly along an axis from the previous vertex — the rubber-band line locks.

**Depends on:** 2, 6, 7

### 9. Edge length popup (`EdgeLengthPopup`) ✅
Click an edge → HTML popup with current length in metres → submit to resize the edge along its axis.

**Requirements:** REQ-10

**Files:**
- `src/components/floor-plans/edge-length-popup.tsx` (new):
  - Props: `open: boolean`, `currentLengthM: number`, `anchorPx: { x: number; y: number }`, `onSubmit: (newLengthM: number) => void`, `onCancel: () => void`.
  - Renders a small absolute-positioned `<form>` with an `<input type="number" step="0.1" min="0.1">` and OK/Cancel buttons.
  - Auto-focuses the input when opened; Esc cancels; Enter submits.
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - Track `edgeLengthEdit: { roomId: string; edgeIndex: number; anchorPx: { x: number; y: number } } | null` state.
  - When `PolygonEditorLayer` calls `onEdgeClick`, set the state.
  - Render `<EdgeLengthPopup>` overlaid on the canvas when state is non-null.
  - On submit: convert metres → cm, call `geometry.resizeEdge`, dispatch the new vertices via `onChange(plan)`.

**Approach:**
- The popup lives in the canvas component (not the editor) so it can position relative to the canvas's container.
- Container's bounding rect is already used for `containerWidth` measurement; reuse it for popup anchoring.
- `currentLengthM` derives from the edge's two vertices: `Math.hypot(dx, dy) / 100`.

**Verification:** Manual: click an edge → popup opens at midpoint with current length pre-filled in m. Enter "5" → edge resizes to 5 m, axis preserved. Esc closes without changes.

**Depends on:** 2, 6

### 10. Clear polygon action ✅
Toolbar button in design mode that discards the active room's polygon and reverts to the canvas rect.

**Requirements:** REQ-12

**Files:**
- `src/components/floor-plans/floor-plan-editor.tsx`:
  - In the design-mode toolbar (next to the view toggle), render a "Clear polygon" button. Only visible when `viewMode === "design"` and the active room has `vertices`.
  - On click: dispatch `onChange` with the active room's `vertices` set to `undefined`. Tables remain at their current `(x, y)` per spec.
- (Confirmation dialog optional — recommend NOT adding one for v1; accidental clicks are recoverable via undo if undo is wired up; if undo isn't covered, leave a quick `confirm()` browser dialog.)

**Approach:**
- Existing keyboard Ctrl/Cmd+Z handler at lines 254–257 in floor-plan-editor.tsx already implements undo via plan history. Polygon clear participates automatically as long as `handlePlanChange` runs.

**Verification:** Manual: with a polygon drawn, Clear polygon discards it; canvas-rect outline returns; tables stay; undo (Ctrl+Z) restores polygon.

**Depends on:** 5

### 11. Polygon-aware table containment ✅
Update the four clamp sites in editor + canvas to clamp to the polygon when one exists.

**Requirements:** REQ-13

**Files:**
- `src/lib/floor-plans/geometry.ts`:
  - Add `clampToPolygon(point: Point, polygon: Point[]): Point` — if the point is inside, return as-is; otherwise project to the nearest point on the polygon's perimeter (closest-edge projection).
  - Unit tests for clamp: inside passes through; outside snaps to nearest edge; corner cases.
- `src/components/floor-plans/floor-plan-editor.tsx` (line 216–223 — `nudgeSelected`):
  - If active room has `vertices`, replace the rect-based `Math.min/Math.max` clamp with `clampToPolygon`.
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - Line 163–170 (`handleTableDragEnd`): same swap.
  - Line 488–520 (`dragBoundFunc` of table Group): same swap. Note this runs on every drag tick, so `clampToPolygon` must be cheap (it is — O(n) in vertex count).
  - Line 205–212 (`handleLabelDragEnd`): same swap.

**Approach:**
- All four sites currently clamp the *centre* of the table. The polygon clamp also operates on the centre; only the geometry function changes.
- For tables that started inside the polygon and the polygon is then reshaped to exclude them, the table stays at its saved coords until the next drag (per spec — preserves current behaviour).

**Verification:** Manual: in a polygonal room, tables can't be dragged into the dead-space outside the polygon. In rect rooms (no vertices), behaviour is unchanged.

**Depends on:** 2, 5

### 12. Manual verification + spec sign-off
Walk through the spec's acceptance-criteria checklist; check off each box.

**Requirements:** All

**Files:**
- `.claude/plans/polygon-rooms-spec.md` — check off acceptance criteria as they pass; record observed behaviour for any criterion that needs a note.
- `.claude/plans/polygon-rooms-test-results.md` (new) — short test-results summary per workflow step 5.

**Approach:**
- Use the `manual-testing` skill (per project workflow) to drive a browser-based pass through every criterion.
- Seed a polygonal room manually if needed (e.g. via dev shell) for test cases that need a pre-existing polygon.

**Verification:** All acceptance-criteria boxes checked.

**Depends on:** 1–11

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (existing W×D dialog → canvas) | (no code change — already true) |
| REQ-2 (faint dashed canvas rect) | 5 |
| REQ-3 (polygon replaces rect when present) | 5, 11 |
| REQ-4 (existing rooms unchanged) | 1, 5 |
| REQ-5 (Design / Populate toggle) | 3 |
| REQ-6 (drawing flow: click / close / Esc / Backspace) | 7 |
| REQ-7 (rubber-band + first-vertex highlight) | 6, 7 |
| REQ-8 (axis + vertex snap) | 2, 8 |
| REQ-9 (vertex drag with snap) | 6, 8 |
| REQ-10 (edge length popup) | 2, 9 |
| REQ-11 (mouse-wheel + button zoom) | 4 |
| REQ-12 (clear polygon) | 10 |
| REQ-13 (point-in-polygon table clamp) | 2, 11 |
| REQ-14 (public view renders polygon) | 5 |
| REQ-15 (Zod accepts vertices) | 1 |

REQ-1 is satisfied by the existing creation flow — no code change needed; flagged here for completeness.

## Risks

- **Konva `<Line closed>` vs rounded `<Rect>`**: replacing the rounded-corner rect with a polygon gives sharper corners. Acceptable visually but worth eyeballing once Task 5 lands; revert / keep both is a 5-line change if desired.
- **Drag-pan interference with vertex/edge interactions**: design mode enables stage drag-pan and vertex drag at once. `cancelBubble = true` on vertex/edge mousedown should prevent stage pan from stealing the gesture, but worth manual testing on touchscreens.
- **Float coordinates during drag vs integer schema**: vertex drag produces float cm values; persist as `Math.round`'d integers (snap-to-cm at save time, keep floats during drag for smoothness). The existing rect schema already uses integers, so the rounding pattern carries over.
- **Tables outside polygon after reshape**: explicit non-goal per spec — the editor doesn't auto-reposition. Could surprise users; consider a small visual cue (e.g. red outline on out-of-polygon tables) as a quick follow-up if it becomes a complaint.
- **`migrateLegacyPlan` already strips unknown fields?**: confirmed it doesn't — it only resets specific invalid fields; `vertices` will pass through. But worth a quick assertion in the integration test.
- **Performance**: a polygon with 24 vertices and 50+ tables triggers `clampToPolygon` on every drag tick (`dragBoundFunc`). Cost is O(n) in vertex count per check — fine. If it ever becomes hot, memoize the polygon edges.
