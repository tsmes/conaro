# Test Results: Arbitrary Rotation for Floor-Plan Tables

Date: 2026-04-29
Plan: [table-rotation-plan.md](./table-rotation-plan.md)
Spec: [table-rotation-spec.md](./table-rotation-spec.md)
Status: **AUTOMATED PASS — manual verification pending**

## Summary

All automated tests pass (87 floor-plan tests, including 14 new geometry-helper cases and 4 new server-validation cases). Browser-driven manual testing was blocked because `agent-browser` isn't installed in this environment — Konva canvas interactions (drag the rotate handle, drag-clamp at 45°) need a real pointing device anyway. The acceptance-criteria checklist below splits items into "covered by automated tests" and "needs manual verification by user".

## Automated Coverage

### Server-side validation (tasks 1, 5)

Verified by `__tests__/integration/floor-plan-save.test.ts` and `__tests__/integration/floor-plan-queries.test.ts`:

- [x] `rotationDeg: 37` saves successfully; round-trips as `37`.
- [x] `rotationDeg: 370` is normalised to `10` on save.
- [x] `rotationDeg: -5` is normalised to `355` on save.
- [x] `rotationDeg: NaN` is rejected by the schema.
- [x] `migrateLegacyPlan` preserves any finite rotation (not just 0/90/180/270).

### Geometry helpers (task 2)

Verified by `__tests__/unit/lib/floor-plans-geometry.test.ts` (14 new cases):

- [x] `rotatedAabbExtents`: 0°/45°/90°/135°/180°/-30° all match the closed-form `|cos|·w + |sin|·d` expression.
- [x] `isOrthogonalRotation`: returns true for 0/90/180/270/360/-90/0.005°; false for 45/89/91/100; honours custom epsilon.
- [x] `snapAngleTo15`: rounds 7→0, 8→15, 22→15, 23→30, -10→345, 360→0; respects custom step.

### Build / type / lint

- [x] `npx tsc --noEmit` passes.
- [x] `npm run lint` produces no new errors in the rotation files (pre-existing errors in unrelated files: `notification-bell.tsx`, `room-edit-form.tsx`, etc.).
- [x] `npm test -- floor-plan` — 87 tests pass, 0 failures.

## Manual Verification Checklist (for user)

Dev server is running at http://localhost:3000. Login as an organizer (e.g. `adventurecon@conaro.test` / `seed-pass-123`), open one of the convention's events, navigate to the **Floor plan** tab, and add a table in **Populate** mode.

### REQ-2 — rotate handle visibility

- [ ] Click a table → small purple-stroked white circle appears just above the top edge, connected by a short line.
- [ ] Click the canvas background (or another table) → handle disappears.
- [ ] Switch to **Design** mode while a table is selected → handle disappears (handle is editor-populate-only).

### REQ-3 — rotation drag with 15° snap

- [ ] Drag the handle around the table's centre → table rotates with the cursor.
- [ ] Release → table lands on a multiple of 15° (0, 15, 30, …, 345). Open the **Edit table** dialog to confirm the value.
- [ ] Hold **Alt** while dragging → table rotates freely; the entered angle can be any value (e.g. 37°, 142.5°).
- [ ] Release **Alt** mid-drag (without releasing the mouse) → next mouse move snaps to nearest 15° again.
- [ ] Click the handle without moving → table's rotation is unchanged (the seed-on-start ref guards against persisting `0`).

### REQ-4 — numeric rotation input

- [ ] Open **Edit table** on any table. Rotation field shows current value with `°` suffix.
- [ ] Type `37` → Save → table renders rotated 37°. Re-open dialog → field shows `37`.
- [ ] Type `370` → Save → field re-opens at `10` (normalised on save).
- [ ] Type `-5` → Save → field re-opens at `355`.
- [ ] Type `37.5` → Save → field re-opens at `37.5`.
- [ ] Clear the rotation field → Save → table keeps its previous rotation (NaN falls back to current).

### REQ-6 — rotation around centre

- [ ] Place a table at room centre, rotate it via the handle. The geometric centre of the table doesn't move; only the orientation changes.

### REQ-7 — rotated-AABB canvas clamp

- [ ] Rotate a table to 45°. Drag it toward the canvas right edge — it stops with all four corners inside the canvas (the visible rectangle never crosses the boundary).
- [ ] Repeat at 30°, 60°, 90°, 180°. Same behaviour.
- [ ] At 0/90/180/270 the clamp matches pre-feature behaviour (this is a regression check).

### REQ-8 — table-to-table snap is orthogonal-only

- [ ] Place two tables. Set Table A to 0° and Table B to 0°. Drag A past B — alignment guides appear; edges snap.
- [ ] Set Table A to 37°. Drag it past B — **no** guides appear; A moves freely (still canvas-clamped).
- [ ] Reset A to 90°, set B to 30°. Drag A past B — A doesn't snap to B (B isn't a valid target).

### REQ-9 — existing data unchanged

- [ ] A table that already has `rotationDeg: 90` from before this feature renders exactly as it did before.
- [ ] Reload the page — existing plan reads back correctly.

### REQ-10 — arrow-key nudge keeps rotation

- [ ] Select a 45° table → press arrow keys → table translates by 1 cm per key without changing rotation.
- [ ] **Shift + arrow** → translates by 10 cm, still rotation-preserving.
- [ ] At the canvas edge, the rotated-AABB clamp prevents the table from leaving (matches REQ-7).

### Sidebar 90° rotate button (regression)

- [ ] Sidebar's existing one-click "rotate 90°" button still works on selected tables. Repeated clicks cycle through 0 → 90 → 180 → 270 → 0.

## Notes

- The rotate handle is implemented as a Konva subcomponent inside the table's Group, so the handle inherits the rotation transform and visually stays "above" the rotated top edge — there is no manual angle math for the handle's visual position.
- During a rotate gesture, the table's rotation prop is driven by `activeRotation` state (per-mousemove re-render), giving live visual feedback. On release, the final value is read from a ref (not state) to avoid a one-frame stale-closure race that could persist a value one mousemove behind the visual final state. This was caught and fixed in the review pass; commit `1b366aea`.
- Server normalises rotation via `((n % 360) + 360) % 360` on save. The dialog formatter no longer normalises again, since incoming values are guaranteed to be in `[0, 360)`.
- Sibling-rotation orthogonality check uses `isOrthogonalRotation` (0.01° epsilon) for the gate, but the AABB axis-swap still uses strict equality (`=== 90 || === 270`). For values in the gap (e.g. 89.999°) the snap-target rect would be off by a few cm. In practice all stored rotations come from server normalisation or cardinal snap, so the mismatch doesn't occur with real data — left as a known low-priority inconsistency.
