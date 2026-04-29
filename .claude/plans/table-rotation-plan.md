# Implementation Plan: Arbitrary Rotation for Floor-Plan Tables

Spec: `.claude/plans/table-rotation-spec.md`

## Technical Decisions

- **Schema change**: `FloorPlanTable.rotationDeg` becomes `number` (was the literal union `0 | 90 | 180 | 270`). Existing data fits unchanged. `FloorPlanLabel.rotationDeg` stays as the existing union — labels aren't in scope here.
- **Server-side normalisation**: Zod accepts any finite number and uses `.transform(n => ((n % 360) + 360) % 360)` so persisted values always live in `[0, 360)`. No DB migration; the JSONB column already stores arbitrary numbers.
- **Geometry helpers go in `src/lib/floor-plans/geometry.ts`** alongside the polygon-drawing snaps already there: `rotatedAabbExtents(widthCm, depthCm, rotationDeg)`, `isOrthogonalRotation(deg, eps = 0.01)`, `snapAngleTo15(deg)`. Pure, easy to unit-test, no dependencies.
- **Rotation handle as a Konva primitive in the table Group**, not a separate layer. Renders only when `selectedTableId === table.id && editable && viewMode === "populate"`. Lives inside the table Group so its rotation transform is inherited from the table — the handle stays "above the top edge" no matter the angle.
- **Alt-key tracking reuses the existing pattern from table drag**: window keydown/keyup listeners attached on `onDragStart`, removed on `onDragEnd`, read via `useRef` inside the rotation handler. Both gestures (drag table + rotate handle) use the same Alt key for the same conceptual action ("disable snap"); they can't fire concurrently so a shared ref is fine.
- **Snap gating for non-orthogonal rotations**: in `floor-plan-canvas.tsx`'s table dragBoundFunc, before calling `computeTableSnap`, gate on `isOrthogonalRotation(table.rotationDeg)`. Off-orthogonal → skip snap entirely (return canvas-clamped raw centre). The snap module itself doesn't need changes.
- **Rotated AABB clamp during drag**: replace the existing `effWidthPx`/`effDepthPx` calculation in the canvas's table-drag pipeline with `rotatedAabbExtents` so the bounding box reflects the actual visible rectangle at any angle. Today's orthogonal case (`effWidthPx = depthCm * scale` when rotated 90°) becomes a special case of the general formula.
- **EditTableDialog save signature change**: `onSave` becomes `(next: { label: string; tableSizeOptionId: string; rotationDeg: number }) => void`. The single existing caller (`handleEditTable` in `floor-plan-editor.tsx`) is updated to pass through.
- **Sidebar's existing 90° rotate button stays**: it's a useful one-click cardinal-rotation shortcut. The cast `as 0 | 90 | 180 | 270` becomes plain `number`.

## Tasks

### 1. Schema + server validation accept any rotation ✅
Drop the literal-union constraint on `FloorPlanTable.rotationDeg`; have the save action normalise any finite number to `[0, 360)`.

**Status:** Completed. Schema widened, Zod normalises with `((n % 360) + 360) % 360`, `migrateLegacyPlan` keeps any finite rotation, sidebar's hard cast removed, integration tests for `37`/`370`/`-5`/`NaN` cases added — all pass.

**Requirements:** REQ-1, REQ-5, REQ-9

**Files:**
- `src/lib/db/schema/events.ts` — change `FloorPlanTable.rotationDeg: 0 | 90 | 180 | 270` to `rotationDeg: number`. Leave `FloorPlanLabel.rotationDeg` as-is (out of scope).
- `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan-actions.ts` — replace the table's `rotationDeg` Zod literal-union with `z.number().finite().transform(n => ((n % 360) + 360) % 360)`. Label schema unchanged.
- `src/lib/floor-plans/queries.ts` — `migrateLegacyPlan` currently coerces table `rotationDeg` to `0` if not in `{90, 180, 270}`; relax that so any number passes through. (Validation still fires on save.)
- `__tests__/integration/floor-plan-save.test.ts` — add cases:
  - Table with `rotationDeg: 37` saves successfully; round-tripped value is `37`.
  - Table with `rotationDeg: 370` is normalised to `10` on save.
  - Table with `rotationDeg: -5` is normalised to `355` on save.
  - Table with `rotationDeg: NaN` is rejected.

**Approach:**
- The literal-union → number widening in the type breaks compile sites that branch on `rotationDeg === 90 || rotationDeg === 270`. Those sites (canvas drag math, label rotation render) need a pass — but most use `=== 90 || === 270` as a heuristic for "is rotated 90°". After this task, canvas math still works for the orthogonal case; later tasks generalise it.
- `migrateLegacyPlan`: today's check is `t.rotationDeg === 90 || === 180 || === 270 ? t.rotationDeg : 0`. Change to: if it's a finite number, keep as-is; otherwise coerce to `0`.

**Verification:** `npm test -- floor-plan-save floor-plan-queries`. New cases pass; existing pass unchanged. Type-check covers the schema change.

**Depends on:** none.

### 2. Rotation geometry helpers + unit tests ✅
Pure functions used by the rotated-AABB clamp, snap gating, and the rotate-handle gesture.

**Status:** Completed. `rotatedAabbExtents`, `isOrthogonalRotation`, `snapAngleTo15` added with 14 new test cases (orthogonal/diagonal AABB, epsilon honoured, NaN rejected, custom snap step). `snapAngleTo15(-10)` is 345 not 350 — the plan's 350 was a typo (not a 15° multiple).

**Requirements:** REQ-3, REQ-7, REQ-8 (math); infrastructure for the rest.

**Files:**
- `src/lib/floor-plans/geometry.ts` — add three exports:
  - `rotatedAabbExtents(widthCm: number, depthCm: number, rotationDeg: number): { halfWidthCm: number; halfDepthCm: number }` — computes axis-aligned bounding-box half-extents of a rect rotated by `rotationDeg` around its centre.
    - Formula: `cos = |cos(θ)|`, `sin = |sin(θ)|`; `aabbW = widthCm * cos + depthCm * sin`; `aabbH = widthCm * sin + depthCm * cos`; halve each.
  - `isOrthogonalRotation(deg: number, epsilonDeg = 0.01): boolean` — true iff the angle is within `epsilonDeg` of `0/90/180/270` (mod 360). Used to gate table-snap.
  - `snapAngleTo15(deg: number, stepDeg = 15): number` — rounds to nearest multiple of `stepDeg`, normalised to `[0, 360)`.
- `__tests__/unit/lib/floor-plans-geometry.test.ts` — add a `describe` block for each new helper:
  - `rotatedAabbExtents`: 0° / 90° / 45° cases for a 200×100 rect; 45° gives `(200+100)/2 / √2`-style extents — assert numerical closeness.
  - `isOrthogonalRotation`: returns true for 0/90/180/270/360/-90; false for 45/89/91/100. Epsilon honoured.
  - `snapAngleTo15`: 7 → 0, 8 → 15, 17 → 15, 22 → 15, 23 → 30, 360 → 0, -10 → 350, 359 → 0.

**Approach:**
- `rotatedAabbExtents`: convert `rotationDeg` to radians; use `Math.abs(Math.cos)` / `Math.abs(Math.sin)` so any quadrant works.
- `isOrthogonalRotation`: normalise to `[0, 360)`, compute distance to nearest multiple of 90, compare against epsilon.
- All three are stateless one-liners; tests cover the corners.

**Verification:** `npm test -- floor-plans-geometry`. All new cases pass.

**Depends on:** none.

### 3. EditTableDialog rotation input ✅
Add a numeric Rotation field to the existing dialog and thread the new value through.

**Status:** Completed. Dialog has a numeric Rotation field with a `°` suffix; the input value is normalised on save (`((n % 360) + 360) % 360`) and falls back to the existing rotation on non-finite input. `formatRotationForInput` shows integer values plain and decimals to 1 dp, so `90` round-trips as `90` and `37.5` survives as `37.5`. `handleEditTable` in the editor accepts the new field and writes it onto the table row. Type-check + 87 floor-plan tests pass.

**Requirements:** REQ-4

**Files:**
- `src/components/floor-plans/edit-table-dialog.tsx`:
  - Add `rotationDeg` to `EditTableDialogProps.onSave` callback shape: `{ label, tableSizeOptionId, rotationDeg }`.
  - Add `useState<string>("")` for the rotation input value (string for the controlled `<Input type="number">`).
  - Reset it from `table.rotationDeg` in the existing `useEffect([table])`.
  - Render an `<Input type="number" step="1" min="0" max="359">` between the size selector and the dialog footer.
  - On Save click: parse to number; if not finite, fallback to existing `table.rotationDeg`; pass through normalisation `((n % 360) + 360) % 360`; include in the `onSave(...)` call.
- `src/components/floor-plans/floor-plan-editor.tsx`:
  - `handleEditTable` (already exists) — extend its argument shape and write `rotationDeg` into the updated table row.

**Approach:**
- Keep the input lightweight: integer step, no degree symbol in the field itself (the label clarifies). Display "°" as a sibling span.
- Normalise the value on save (caller side too) so even bare numbers like `370` end up correct.

**Verification:** Manual: open the dialog on a table, type `37`, save; the table renders rotated 37°. Re-open dialog → field shows `37`.

**Depends on:** 1.

### 4. Rotation handle in the canvas + Alt-aware 15° snap ✅
Adds the visible rotate handle on the selected table and the drag gesture that turns it.

**Status:** Completed. The selected table renders a `RotationHandle` (connector line + circle) anchored above its top edge inside the table Group, so the handle inherits the parent's rotation transform and visually stays "above" the rotated table. Drag start sets `activeRotation` so the Group renders with the in-progress angle (live feedback) and attaches Alt keydown/keyup listeners to a dedicated `rotateAltPressedRef`. The handle's `dragBoundFunc` derives the new rotation from `atan2(cursor - centre)`, snaps to the nearest 15° via `snapAngleTo15` unless Alt is held, and returns the explicit stage-frame point on the rotated top edge to avoid a one-frame visual flash. Drag end persists via `handleTableRotationChange` (mirrors the field-stripping pattern in `handleTableDragEnd`) and cleans up listeners + refs. Type-check + 87 floor-plan tests pass.

**Requirements:** REQ-2, REQ-3, REQ-6

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - Inside the existing per-table render loop, when `editable && viewMode === "populate" && selectedTableId === table.id`, render a draggable Konva `Circle` (radius ~6 px, white fill, primary-purple stroke) with a short connector line. The handle's local-coordinate position is `(0, -hPx / 2 - 18)` (above the table top edge in the Group's rotated frame).
  - The handle's `dragBoundFunc` returns the cursor position unchanged (it's not constrained to a circle — we compute the angle instead).
  - On `onDragStart` for the handle: capture initial `e.evt.altKey` into `rotateAltPressedRef`; attach window keydown/keyup to update the ref. Wire the existing alt-cleanup ref pattern.
  - On `onDragMove`: read the absolute cursor position via `stage.getPointerPosition()`, compute angle `θ = atan2(cursor.y - tableCenterY, cursor.x - tableCenterX)` in stage coords; subtract a baseline (handle at -90° from centre when rotation = 0) to derive the table's rotation. If `!rotateAltPressedRef.current`, snap via `snapAngleTo15`.
  - On `onDragEnd`: dispatch the new rotation via `onChange` (full plan with this table's `rotationDeg` updated). Detach window listeners; clear ref.
  - The handle's own visual position is `(0, -hPx / 2 - 18)` in the Group's local frame — since the Group rotates with the table, the handle visually stays "above" the top edge regardless of angle. No manual angle-of-handle math needed.

**Approach:**
- Pseudo-code for the angle derivation:
  ```
  // In stage coordinates (before stage transform — populate mode is identity):
  const dx = cursor.x - tableCenterStageX
  const dy = cursor.y - tableCenterStageY
  const angleFromCentreDeg = atan2(dy, dx) * 180 / PI
  // Handle sits at -90° relative to table's "up" (top edge). When the
  // table is at rotation R, the handle's stage angle equals R - 90.
  // So R = angleFromCentreDeg + 90.
  const proposedRotation = normalize(angleFromCentreDeg + 90)
  const finalRotation = altPressedRef.current
    ? proposedRotation
    : snapAngleTo15(proposedRotation)
  ```
- The handle should pre-emptively call `e.cancelBubble = true` on `onMouseDown`/`onTouchStart` so the table's drag doesn't fight for the gesture.
- Use a separate `rotateAltPressedRef` from `altPressedRef` (table-drag) to avoid lifecycle races between the two gestures. Both modifiers respond to Alt; conceptually identical.

**Verification:** Manual:
- Click a table → handle appears just above it.
- Drag the handle around → table rotates; releases at the nearest 15° step.
- Hold Alt while dragging → table rotates to any angle. Release Alt mid-drag → next move snaps again.
- Click off → handle disappears; rotation persists.

**Depends on:** 1, 2.

### 5. Rotated-AABB clamp during table drag ✅
Replace the existing `effWidthPx`/`effDepthPx` clamp math (which assumes orthogonal rotation) with `rotatedAabbExtents` so any angle stays within the canvas.

**Status:** Completed. `rotatedAabbExtents` now drives the canvas-clamp half-extents in three places: the per-table render-loop (which feeds `dragBoundFunc`'s `minCx/maxCx/minCy/maxCy`), `handleTableDragEnd` in the canvas, and `nudgeSelected` in the editor. The render-loop call uses `currentRotation` so the live rotate-handle gesture clamps against the in-progress angle, not the pre-drag one. Orthogonal cases collapse to the previous swap-axes math (cos/sin = 0 or 1) so existing behaviour is preserved. Type-check + 87 floor-plan tests pass.

**Requirements:** REQ-7

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - In the per-table render loop, replace:
    ```
    const rotated = table.rotationDeg === 90 || table.rotationDeg === 270;
    const effWidthPx  = (rotated ? size.depthCm : size.widthCm) * scale;
    const effDepthPx  = (rotated ? size.widthCm : size.depthCm) * scale;
    ```
    with:
    ```
    const aabb = rotatedAabbExtents(size.widthCm, size.depthCm, table.rotationDeg);
    const effWidthPx = aabb.halfWidthCm * 2 * scale;
    const effDepthPx = aabb.halfDepthCm * 2 * scale;
    ```
    (For orthogonal rotations the numbers come out identical, so existing behaviour is preserved.)
  - The same `effWidthPx` / `effDepthPx` feed `minCx`/`maxCx`/`minCy`/`maxCy` and the `dragBoundFunc`'s canvas-rect clamp. No further changes needed in those.
  - In `floor-plan-canvas.tsx`'s `handleTableDragEnd`, replace the same `rotated`-based extents with the AABB. Same in `floor-plan-editor.tsx`'s `nudgeSelected`.
- `src/components/floor-plans/floor-plan-editor.tsx`: import `rotatedAabbExtents`; use it instead of the orthogonal `rotated` ternary in `nudgeSelected`.

**Approach:**
- For `nudgeSelected`, the half-extents are now full (not just 90° swap), and clamp uses them the same way: `Math.max(half, Math.min(canvas - half, centre))`.
- The visual table size — `wPx = size.widthCm * scale`, `hPx = size.depthCm * scale` — does **not** change. The Group is drawn at its original rect, and the rotation transform handles the visual. Only the bounding-box math for clamping changes.

**Verification:** Manual:
- Rotate a table to 45° via Task 4's handle.
- Drag it toward the canvas right edge — it stops at the edge with all four corners inside the canvas.
- Repeat at 30°, 60°, 90°, 180°.
- Tables at 0/90/180/270 behave identically to before.

**Depends on:** 1, 2.

### 6. Gate table-to-table snap on orthogonal rotation ✅
Stop running `computeTableSnap` when the dragged table isn't at 0/90/180/270.

**Status:** Completed. The dragBoundFunc's "skip snap" branch now also fires when `!isOrthogonalRotation(currentRotation)`, returning the canvas-rect-clamped raw cursor with guides cleared. The sibling SnapTarget collection loop additionally skips any sibling whose own rotation isn't orthogonal — its AABB wouldn't represent its actual edges, so snapping to it would line up against empty space. Both checks use the existing `isOrthogonalRotation` helper (0.01° epsilon). Type-check + 87 floor-plan tests pass.

**Requirements:** REQ-8

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx`:
  - In the dragBoundFunc, just before the `computeTableSnap` call (and the SnapTarget collection), add:
    ```
    if (!isOrthogonalRotation(table.rotationDeg)) {
      setSnapGuides(prev => prev === null ? prev : null);
      // skip straight to the canvas-rect clamp on the raw proposed centre
    }
    ```
  - Restructure so that if the rotation isn't orthogonal, the dragBoundFunc returns the canvas-rect-clamped raw position (no snap, no guides, no SnapTarget collection).

**Approach:**
- A simple early branch — keeps the orthogonal happy path unchanged.
- Snap targets *from* siblings still build correctly only for orthogonal-rotation siblings; non-orthogonal siblings shouldn't contribute either (their AABB doesn't represent their actual edges). Skip non-orthogonal siblings inside the SnapTarget collection loop:
  ```
  if (!isOrthogonalRotation(sibling.rotationDeg)) continue;
  ```

**Verification:** Manual:
- Rotate Table A to 37°. Drag it past Table B (at 0°) — no guides appear; table moves freely.
- Rotate Table A back to 90°. Drag it past Table B — guides reappear and edges align.
- Rotate Table B to 30° but keep Table A at 0°. Drag A past B — A doesn't snap to B (B isn't a valid target).

**Depends on:** 1, 2.

### 7. Manual verification + spec sign-off ⏳
Walk through the spec's acceptance criteria; capture a results file.

**Status:** Test-results scaffold + manual checklist written to `table-rotation-test-results.md`. Server-validation acceptance criterion checked off in the spec (covered by `floor-plan-save.test.ts`). The remaining 12 acceptance criteria require Konva canvas interaction — `agent-browser` isn't installed in this environment and rotate-handle drag needs precise mouse gestures that wouldn't be reliable through automation anyway. The user runs through the manual checklist with the dev server already up at http://localhost:3000.

**Requirements:** All

**Files:**
- `.claude/plans/table-rotation-spec.md` — check off acceptance criteria.
- `.claude/plans/table-rotation-test-results.md` — new file recording results.

**Approach:**
- Use the `manual-testing` skill (in-browser if `agent-browser` is available; otherwise summarise what's automated and write the manual plan for the user).

**Verification:** All boxes checked or deviations recorded.

**Depends on:** 1–6.

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (any angle 0–360) | 1 |
| REQ-2 (rotate handle) | 4 |
| REQ-3 (15° snap, Alt for free) | 2, 4 |
| REQ-4 (numeric input in dialog) | 3 |
| REQ-5 (persist + normalise) | 1 |
| REQ-6 (rotation around centre) | 4 (handle) — already true today via Konva Group rotation |
| REQ-7 (rotated AABB canvas clamp) | 2, 5 |
| REQ-8 (snap orthogonal-only) | 2, 6 |
| REQ-9 (existing tables unchanged) | 1, 5 |
| REQ-10 (nudge keeps rotation) | 5 (uses AABB but doesn't touch rotationDeg) |

## Risks

- **Konva drag-handle gesture vs table-drag gesture conflict**: the rotate handle lives inside the table Group, which is also `draggable`. Without `cancelBubble = true` on the handle's mouse/touch start, the table's drag wins. Plan calls this out — verify in manual testing.
- **Cardinal-angle "free rotation" edge case**: if a user holds Alt and rotates to ~89.99° they end up with a non-orthogonal rotation that won't trigger snap. The 0.01° epsilon in `isOrthogonalRotation` mitigates the visual case but a user typing `89.99` in the dialog would also fall outside snap. Acceptable trade-off; documented.
- **Existing legacy-migration relaxation**: `migrateLegacyPlan` historically coerced unknown rotation values to `0` defensively. After Task 1 it lets any finite number through. Tables stored from this point can hold non-integer values; older readers (none in production yet) would have rendered them at `0`. No data risk.
- **EditTableDialog form input**: the rotation `<Input type="number">` may emit float values via certain locales. The normaliser `((n % 360) + 360) % 360` handles negative + decimal inputs but the UI should display rounded values for readability. Round to 1 decimal in the display value.
- **Alt key shared between two gestures**: same Alt key disables both table-drag snap and rotate-handle 15° snap. Since you can only run one drag gesture at a time, the two refs don't collide. Worth keeping refs separate (per technical decisions) so the listener cleanup can't get confused if a gesture is interrupted abnormally.
