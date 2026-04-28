# Polygon Rooms — Implementation & Verification Notes

Spec: `.claude/plans/polygon-rooms-spec.md`
Plan: `.claude/plans/polygon-rooms-plan.md`

## Automated Verification

| Check | Status | Notes |
|---|---|---|
| `npx tsc --noEmit` | ✅ | Project-wide type check clean after every task. |
| `npm test` (all suites) | ✅ | 522 tests pass; 4 new integration cases for polygon Zod + 28 new geometry unit tests added. |
| `npx eslint` (changed files) | ✅ | No new lint errors introduced. One pre-existing warning in `floor-plan-editor.tsx:114` (`refs during render`) was already on `main` before this branch. |

### New tests
- `__tests__/unit/lib/floor-plans-geometry.test.ts` — 28 cases covering pointInPolygon (convex + L-shape concave), snapToAxis, snapToVertex, resizeEdge, clampToPolygon, polygonBoundingBox, edgeLengthCm.
- `__tests__/integration/floor-plan-save.test.ts` — 4 new cases:
  - Saves a polygon room with vertices.
  - Rejects polygons with fewer than 3 vertices.
  - Rejects out-of-range coordinates.
  - `migrateLegacyPlan` preserves vertices on read.

## Acceptance Criteria

Server-side checks were verified via the integration tests. The UI flows below need an in-browser pass — they're implemented to spec but haven't been visually exercised.

| # | Criterion | Verified |
|---|---|---|
| 1 | New room with W=10m, D=5m → 10×5m canvas + faint dashed rectangle | ⏳ manual |
| 2 | Without polygon, room behaves as today | ⏳ manual |
| 3 | Existing rect room renders/clamps identically (no migration) | ✅ migrateLegacyPlan integration test |
| 4 | Click points → vertices + rubber-band line | ⏳ manual |
| 5 | Cursor near horizontal/vertical (~5°) → segment snaps to axis | ⏳ manual |
| 6 | Cursor near existing vertex (~10px) → snaps | ⏳ manual |
| 7 | First vertex highlights when hover near; click closes | ⏳ manual |
| 8 | Esc cancels in-progress; Backspace removes last vertex | ⏳ manual |
| 9 | Cannot close with fewer than 3 vertices | ⏳ manual (close affordance only appears at 3+ in code) |
| 10 | Drag existing vertex → repositions with snap | ⏳ manual |
| 11 | Click edge → length popup; submit resizes along axis | ⏳ manual |
| 12 | Mouse wheel zooms; on-screen +/- buttons step zoom | ⏳ manual |
| 13 | Clear polygon reverts to canvas rect; tables stay | ⏳ manual |
| 14 | Populate view: tables can't drag outside polygon | ⏳ manual |
| 15 | Public floor plan page shows polygon for rooms with one | ⏳ manual |
| 16 | Save + reload renders the same polygon | ⏳ manual |
| 17 | Server rejects <3 vertices, NaN, out-of-range | ✅ integration test |

## Implementation Summary

12 commits on `main`:
1. `feat(floor-plan): allow optional polygon vertices on rooms` — schema + Zod + 4 integration tests + spec/plan files.
2. `feat(floor-plan): geometry utilities for polygon rooms` — pure functions + 28 unit tests.
3. `feat(floor-plan): Design / Populate view toggle` — segmented control + sidebar visibility.
4. `feat(floor-plan): canvas viewMode prop + pan/zoom in design mode`.
5. `feat(floor-plan): polygon-aware room frame rendering`.
6. `feat(floor-plan): polygon editor layer scaffold` — vertices + edges interactive.
7. `feat(floor-plan): polygon drawing flow` — click / close / esc / backspace / rubber-band.
8. `feat(floor-plan): axis + vertex snapping for polygon drawing and drag`.
9. `feat(floor-plan): edge length popup for polygon rooms`.
10. `feat(floor-plan): clear polygon action in design toolbar`.
11. `feat(floor-plan): polygon-aware table containment` — 4 clamp sites updated; tables non-draggable in design mode.

Out-of-scope items (deferred per spec):
- Column / stairs / door annotations.
- Insert or remove vertices on existing polygons.
- Curved walls.
- Auto-repositioning tables when polygon shrinks.
- Self-intersecting polygon detection.
- Snap-to-grid.

## Headless smoke checks (loop iteration)

Attempted automated browser-driven UI verification via `manual-testing` skill — `agent-browser` is not installed in this environment, so the polygon drawing flow can't be exercised programmatically here. Lightweight reachability checks done via curl against the running dev server (`localhost:3000`):

| Check | Result |
|---|---|
| Organizer floor-plan page returns auth redirect | ✅ HTTP 307 (login redirect, as expected for unauthenticated curl) |
| Public floor-plan page on unpublished event returns 404 | ✅ HTTP 404 (publish gate working) |

The 16 UI acceptance criteria still need a human-driven browser pass — see plan below.

## Manual Verification Plan

To finish the spec sign-off, run these in a browser:

1. `npm run dev` and log in as a convention organizer (e.g. `magicon@conaro.test` / `seed-pass-123`).
2. Open `/conventions/manage/events/<id>/floor-plan`.
3. Add a new room (10m × 5m). Toggle to **Design** mode.
4. Confirm the faint dashed canvas rect is visible; toggle back to Populate — same room, no polygon, can place tables anywhere inside the rect.
5. Back to Design. Click 4–6 points around the canvas to draw an L-shape; verify axis snapping, vertex snapping, rubber-band line, first-vertex halo, and that clicking the first vertex closes.
6. Hit Esc mid-draw → cancels. Hit Backspace mid-draw → removes the last vertex.
7. Drag a vertex of the closed polygon — confirm snap behaviour. Click an edge — popup shows current length; submit a new value, verify the edge resizes along its axis.
8. Click "Clear polygon" in the toolbar — polygon disappears, canvas rect returns.
9. Switch to Populate. Try dragging a table into the dead-space outside the polygon — it should clamp to the polygon perimeter.
10. Open the public floor plan view in another tab — confirm the polygon renders without the editor controls.
11. Save and reload the page — polygon persists.
