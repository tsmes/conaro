# Table-to-Table Alignment Snap

## Problem Statement

Now that polygon-aware drag clamping has been removed (it was unstable on non-convex shapes), organizers need a different precision tool when laying out tables. Without alignment aids, getting two stands to share an edge or sit centre-aligned in a row requires squinting at integer cm values. Industry-standard smart guides — snap to neighbouring table edges/centres and to canvas edges/centres while dragging — solve this directly.

## Requirements

- **REQ-1** While a table is being dragged in Populate mode, it snaps along each axis to align with another table's or the canvas's reference lines.
- **REQ-2** Snap targets: each table contributes 6 reference lines — left edge, right edge, horizontal centre, top edge, bottom edge, vertical centre. The canvas contributes 6 reference lines (its 4 edges plus its horizontal/vertical centres).
- **REQ-3** A snap fires on a given axis when the dragged table's nearest reference line is within ~6 screen pixels of a target reference line. The closer line wins when multiple targets are in range.
- **REQ-4** When a snap fires, a visual guide (Figma-style smart guide — a thin coloured line spanning between the two aligned reference points) appears for the duration that the snap is engaged. Multiple guides can show at once (e.g. left-edge snap on x and centre snap on y).
- **REQ-5** Holding **Alt** during drag suppresses snapping entirely — the table moves to the raw cursor position. Releasing Alt re-engages snap mid-drag. Guides are not drawn while Alt is held.
- **REQ-6** Snap targets are limited to the active room: tables in other rooms aren't considered.
- **REQ-7** Snap considers tables only — labels are not snap targets.
- **REQ-8** Snap is per-axis: x-snap and y-snap are independent. The dragged table can be snapped on x to one neighbour and on y to a different neighbour or to the canvas centre.
- **REQ-9** Tables remain clamped to the canvas-rect bounds (post-snap). Snap doesn't push a table outside the canvas.
- **REQ-10** Snap applies only during drag — it does not apply to arrow-key nudge or to programmatic moves.

## Scope

### In Scope

- Edge + centre alignment between the dragged table and other tables in the active room
- Edge + centre alignment between the dragged table and the canvas rectangle
- Per-axis independent snap (x and y considered separately)
- Smart-guide visual feedback while snap is engaged
- Alt-to-disable modifier
- Drag-only behaviour in Populate mode

### Out of Scope (deferred)

- Equal-spacing distribution snap (dragging a 4th table to extend a 3-table series)
- Snap to labels or to polygon vertices/edges
- Snap during arrow-key nudge
- Snap to a fixed grid (no 50/100 cm grid snap)
- Persisted snap-toggle setting per user
- Non-axis-aligned snap (covered by the separate "arbitrary rotation" feature later)

## Acceptance Criteria

- [ ] Drag a table into a row of existing tables — its top and/or bottom edge snaps when within ~6px of a neighbour's matching edge; a horizontal guide line appears for the duration of the snap.
- [ ] Drag a table near the canvas centre — its centre line snaps to the canvas centre on each axis independently; a guide line marks each engaged axis.
- [ ] Drag table A close to table B's *centre* line — A's centre snaps to B's centre; works for both x and y.
- [ ] Hold Alt while dragging — no snap fires, no guide is drawn, the table moves to the raw cursor position.
- [ ] Release Alt mid-drag — snap re-engages immediately on the next mousemove.
- [ ] Tables in other rooms (when switching rooms) don't influence snap on the active room's tables.
- [ ] Labels are not snap targets — drag a table near a label and no snap fires from the label.
- [ ] After dragging across the canvas, the table never lands outside the canvas-rect bounds even when snap would suggest otherwise (canvas-rect clamp wins).
- [ ] Arrow-key nudge moves a table 1 cm or 10 cm with Shift; no snap occurs (matches today's behaviour).
- [ ] Smart guides disappear when the drag ends.
- [ ] When two snap targets are in range on the same axis, the closer one wins (only one guide per axis at a time).

## Constraints

- Integration point is the existing Konva `dragBoundFunc` on the table Group in `floor-plan-canvas.tsx`. Snap math runs there per drag tick.
- Threshold is in screen pixels, not cm — so it converts via the current scale to keep the snap feel consistent across zoom levels.
- Tables in this iteration are axis-aligned-rotated (0/90/180/270) — arbitrary rotation is a separate feature that will need to revisit snap geometry once it lands.
- Snap state (which lines are currently engaged) is canvas-component state; smart guides render as Konva primitives in a dedicated layer that mounts only during drag.
