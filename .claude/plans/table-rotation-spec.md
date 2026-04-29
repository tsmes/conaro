# Arbitrary Rotation for Floor-Plan Tables

## Problem Statement

Convention venues sometimes need tables placed diagonally — at corner spots, along curved walls, or to fit awkward floor shapes. The current 0/90/180/270 constraint forces organizers to give up or fake the layout. Allowing arbitrary rotation closes that gap with a familiar Figma-style rotate handle, while keeping the orthogonal common case fast via 15° snapping.

## Requirements

- **REQ-1** Tables can be rotated to any angle in `[0, 360)` degrees, not just 0/90/180/270.
- **REQ-2** When a table is selected in Populate mode, a small rotate handle appears just above the table. Dragging the handle around the table's centre rotates the table.
- **REQ-3** While the handle is dragged, rotation snaps to 15° increments. Holding **Alt** during the rotate gesture suppresses snapping for free rotation; releasing Alt re-engages snap.
- **REQ-4** `EditTableDialog` exposes a numeric rotation input (degrees, integer or one decimal). Submitting writes the entered value to the table.
- **REQ-5** Rotation is persisted with the rest of the floor plan via the existing save flow. Server-side validation accepts any finite number, normalising to `[0, 360)`.
- **REQ-6** The table's visual rendering applies the rotation around the table's centre (matches today's behaviour for orthogonal angles).
- **REQ-7** While dragging a rotated table, the table is clamped to the canvas rect using its **rotated bounding box** — the visible rectangle never escapes the canvas no matter what angle it has.
- **REQ-8** Table-to-table alignment snap fires only when the dragged table's rotation is exactly 0/90/180/270. At other angles, drag is free of snap (still canvas-rect clamped per REQ-7).
- **REQ-9** Existing tables (rotation 0/90/180/270) continue to render and behave as today; no migration required.
- **REQ-10** Arrow-key nudge keeps working at any rotation: nudge translates the table's position; rotation is unchanged.

## Scope

### In Scope

- Numeric rotation field on `FloorPlanTable` accepting any angle in `[0, 360)`
- Drag-handle UI on selected tables in Populate mode
- 15° snap during rotate gesture; Alt to free-rotate
- Numeric rotation input in `EditTableDialog`
- Rotated-AABB canvas-rect clamp during table drag
- Conditional table-to-table snap (orthogonal only)
- Server-side validation accepting any finite rotation; normalising to `[0, 360)`

### Out of Scope (deferred)

- Rotation snap targets between tables (snapping rotation to match a neighbour's angle)
- Snap to other tables when rotated to a non-orthogonal angle (covered in REQ-8 — disabled)
- Rotating multiple selected tables at once (no multi-select today)
- Keyboard shortcuts for rotation (no `R` to rotate, etc.)
- Rotation handle in viewer / public view (handle is editor-only)
- Animated rotation transitions
- Per-table rotation locking / read-only modes

## Acceptance Criteria

These are verified during manual testing. Each must be checked off before the feature is considered complete.

- [ ] Selecting a table in Populate mode shows a small rotate handle above the table; deselecting hides it.
- [ ] Dragging the rotate handle rotates the table around its centre. The table follows the cursor.
- [ ] By default, rotation lands on multiples of 15° (0, 15, 30, …, 345).
- [ ] Holding Alt while dragging the handle disables snap; the table rotates to any angle.
- [ ] Releasing Alt mid-rotate re-engages 15° snap on the next move.
- [ ] `EditTableDialog` shows a numeric Rotation input pre-filled with the current value; submitting a new value updates the table's rotation.
- [ ] An existing table saved before this change (e.g. `rotationDeg: 90`) renders identically to today.
- [ ] Saving a table at 37° and reloading the page renders the table at 37°.
- [ ] Dragging a rotated table near a canvas edge stops at the edge — the rotated bounding box never crosses the canvas boundary.
- [ ] Dragging a table that's at exactly 0/90/180/270 still produces alignment guides against neighbours.
- [ ] Dragging a table that's at a non-orthogonal angle (e.g. 37°) does not produce alignment guides; the table moves freely (still canvas-clamped).
- [ ] Arrow-key nudge of a rotated table moves it without changing rotation.
- [ ] Server rejects rotation values that aren't finite numbers; accepts and normalises any finite number to `[0, 360)` (e.g. `370` → `10`, `-5` → `355`).

## Constraints

- The schema change replaces a literal-union type (`0 | 90 | 180 | 270`) with `number`. Backwards compatible at runtime since stored values were already integers in that set.
- Persistence reuses the existing full-plan save flow with Zod validation; no new endpoints.
- The table-snap module added recently keys behaviour off rotation being orthogonal — this spec preserves that and adds the Alt-rotate modifier alongside the existing Alt-disable-table-snap modifier (same key, different gesture context).
- Rotation-handle hit area must stay reachable when a table is fully snapped to a canvas edge (handle extends slightly above the table; canvas padding accommodates this).
