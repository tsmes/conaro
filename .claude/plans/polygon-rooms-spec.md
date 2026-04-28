# Polygon-shaped Rooms in the Floor Planner

## Problem Statement

Real venues aren't always rectangular — many convention rooms have L-shapes, alcoves, cut-off corners, etc. The current floor planner only models axis-aligned rectangles, forcing organizers to either misrepresent their venue or plan around imaginary walls. Organizers should be able to define a polygonal room outline that matches reality, then place tables inside it.

## Requirements

- **REQ-1** Adding a new room still uses the existing W×D dialog. The dimensions become the room's persistent **canvas** (the coordinate extents).
- **REQ-2** A faint dashed rectangle outlining the canvas is always visible in Design view as a scale reference. When no polygon has been drawn, this rectangle *is* the room.
- **REQ-3** When a polygon is drawn, it replaces the canvas rect as the room outline. Tables, public view, and containment all use the polygon.
- **REQ-4** Existing rooms (no polygon stored) continue to work unchanged. No data migration required.
- **REQ-5** The editor exposes two toggleable views: **Design** (canvas dimensions, polygon outline) and **Populate** (tables, assignments). Each view shows only its own toolbar.
- **REQ-6** In Design view the user draws a polygon by clicking sequential points on the canvas. Clicking the first vertex closes the polygon. Esc cancels the in-progress draw. Backspace removes the last placed point.
- **REQ-7** A live "rubber-band" line follows the cursor from the last placed vertex during drawing. When the cursor is near the first vertex it highlights to indicate that clicking will close.
- **REQ-8** The drawing tool snaps lines to horizontal / vertical (within ~5° of axis), and snaps endpoints to other vertices (within ~10px screen space).
- **REQ-9** Existing polygon vertices can be dragged to reposition, with the same snapping rules.
- **REQ-10** Clicking an edge opens a length input. Entering a value resizes that edge along its current axis; the lower-indexed endpoint anchors, the other moves.
- **REQ-11** Mouse wheel and on-screen zoom controls let the user zoom for precision.
- **REQ-12** A "Clear polygon" action discards the polygon and reverts the room to its canvas rect.
- **REQ-13** In Populate view, tables clamp to the polygon outline (point-in-polygon) when one exists, or the canvas rect otherwise.
- **REQ-14** The public floor plan view renders the polygon outline when present, the canvas rect otherwise.
- **REQ-15** Server-side Zod validation accepts polygon vertices (min 3, reasonable max), persisted alongside existing canvas dimensions.

## Scope

### In Scope

- Two-view split (Design / Populate) toggleable on the existing floor-plan page
- Polygon outline drawing with click-to-add / click-first-to-close / Esc / Backspace
- Snap to horizontal/vertical axis and snap to existing vertices
- Drag vertices on existing polygons, with same snapping
- Numeric line-length input on edges (axis-preserving, anchored to lower-indexed endpoint)
- Mouse-wheel + button zoom in editor
- Faint dashed canvas-rect always visible as scale reference
- Canvas-rect fallback when no polygon drawn (covers existing rooms)
- Point-in-polygon table clamping
- Public floor plan view renders the polygon outline
- Backwards-compatible schema change (existing rooms unaffected)

### Out of Scope (deferred to a follow-up)

- Column / stairs / door / annotation primitives
- Insert or remove vertices on an existing polygon (must clear and redraw to restructure)
- Curved walls or arcs
- Multiple disjoint polygons in a single room
- Auto-repositioning tables when a polygon shrinks below them — preserves current behaviour: drag re-clamps; saved positions stay until next interaction
- Self-intersecting polygon detection / prevention
- Snap-to-grid (50cm or 100cm) — axis snap + numeric length covers the precision case

## Acceptance Criteria

These are verified during manual testing. Each must be checked off before the feature is considered complete.

- [ ] Adding a new room with W=10m, D=5m shows a 10×5m canvas with a faint dashed rectangle outlining it.
- [ ] Without drawing a polygon, that room behaves as today: tables can be placed up to those bounds; public view shows the rect.
- [ ] An existing room saved before this change renders and clamps identically to before — no migration needed.
- [ ] In Design view, clicking points on the canvas places vertices with a rubber-band line from the last vertex to the cursor.
- [ ] Cursor near horizontal/vertical axis (within ~5°) snaps the in-progress segment to that axis.
- [ ] Cursor near an existing vertex (within ~10px screen) snaps to that vertex.
- [ ] Hovering near the first vertex highlights it; clicking closes the polygon.
- [ ] Esc during drawing discards the in-progress polygon. Backspace removes the most recently placed vertex.
- [ ] Closing a polygon with fewer than 3 vertices is not possible (close affordance only appears at 3+).
- [ ] Once a polygon exists, dragging any vertex repositions it with the same axis + vertex snap rules.
- [ ] Clicking an edge opens a length input pre-filled with the current length in meters; submitting a new length resizes the edge along its axis.
- [ ] Mouse wheel zooms the canvas in/out around the cursor; on-screen zoom buttons step zoom in fixed increments.
- [ ] "Clear polygon" reverts the room to its canvas rect; tables remain in place.
- [ ] In Populate view, a table can't be dragged outside the polygon outline.
- [ ] The public floor plan page shows the polygon outline (or canvas rect when none) for every room.
- [ ] Saving a plan with a polygon and reloading the page renders the same polygon.
- [x] Server rejects a polygon with fewer than 3 vertices, NaN coordinates, or vertices outside reasonable bounds (e.g. > 1000m from origin).

## Constraints

- The schema change must be backwards-compatible. Existing JSONB rooms without `vertices` continue to render and behave as today.
- Editing persists via the existing full-plan-overwrite save flow (`updateFloorPlan`) with Zod validation; no separate API endpoints.
- Public view reuses the same canvas component the editor uses, via the existing `editable={false}` prop. The Design / Populate toggle is editor-only.
- Snap thresholds (5° axis, 10px vertex) and zoom range are tunable constants — not part of the spec contract.
