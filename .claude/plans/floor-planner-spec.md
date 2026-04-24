# Floor planner (v1)

## Problem Statement
Organizers run events with dozens of tables across one or more rooms, but Conaro only tracks counts (`availableStands`). There's no way to map tables to positions, no way to see "who sits where", and no way to show attendees or artists the layout. Spatial planning happens in external tools and never reaches the artists. A simple planner inside the event closes the loop.

## Requirements
- **REQ-1** For each event, the organizer can open a floor-planner canvas at a fixed real-world scale (metres).
- **REQ-2** The organizer can create one or more **rooms** by drawing axis-aligned rectangles. Each room has a name and shows its real-world dimensions (metres, 1-decimal).
- **REQ-3** The organizer can place **tables** inside a room by picking from the event's `tableSizeOptions`. Each placed table renders at its real-world dimensions and carries a label (`T12`) plus its size name (`Standard`).
- **REQ-4** Tables can be dragged to reposition.
- **REQ-5** The organizer can assign an **accepted artist** to each table. Mismatched sizes (artist requested a different `tableSizeOptionId`) are allowed but flagged with a non-blocking warning.
- **REQ-6** Unassigned tables are allowed — the plan can be drawn before the full roster is final.
- **REQ-7** `tableSizeOptions` gains structured `widthCm` + `depthCm` numeric fields, captured in the event editor. A size without numeric dimensions cannot be placed in the planner (shows a "Set dimensions" prompt).
- **REQ-8** Once results are published, the floor plan is visible on the public event page to everyone. A read-only render shows rooms, tables, and each table's assigned artist name.
- **REQ-9** An accepted artist viewing the public event page sees their own table visually highlighted ("you are here").
- **REQ-10** The organizer can delete rooms, tables, and assignments individually.
- **REQ-11** A table with no artist assigned renders as empty / available.

## Scope

### In Scope
- Rectangular rooms only.
- Axis-aligned tables only (no rotation in v1).
- Flat 2D, single level per event.
- Persistent floor plan stored per event.
- Structured `widthCm` + `depthCm` on `tableSizeOptions`, with form + validation support.
- Public read-only render of the plan on the event page after publish.
- "You are here" highlighting for the viewing accepted artist.
- Drag-to-move tables; click-to-assign artists.

### Out of Scope (explicit)
- Rotation of tables or rooms.
- Non-rectangular rooms, obstacles, columns, stages, doors, walls beyond the room perimeter.
- PDF / PNG export.
- Multi-floor buildings, 3D, scenic elements, traffic simulation, zoning rules.
- Table sharing (two artists on one table) or an artist at multiple tables.
- Pre-publish visibility to anyone but the organizer.
- Snapping / alignment guides / measuring tool beyond a basic background grid.
- Mobile-friendly edit mode (desktop only for editing; read-only view renders anywhere).

## Acceptance Criteria
- [ ] Organizer can open a Floor plan card on the event-management page and create a room with a real-world size (e.g. 8.5 m × 5.0 m).
- [ ] Organizer can place multiple tables inside a room, each picked from the event's `tableSizeOptions`; each renders at its structured dimensions.
- [ ] Dragging a table updates its position; reloading shows the updated position.
- [ ] Clicking a table opens an assignment picker listing accepted artists; picking one binds them; the picker can clear / change the assignment.
- [ ] Placing an artist whose requested `tableSizeOptionId` differs from the table's size shows a non-blocking warning on that table.
- [ ] Creating a `tableSizeOptions` entry in the event editor requires `widthCm` + `depthCm` alongside label / dimensions / price.
- [ ] A pre-existing event whose table sizes lack the new numeric fields shows a "Set dimensions" prompt inside the planner for those sizes.
- [ ] Once results are published, the floor plan is visible to every visitor on the public event page.
- [ ] An accepted artist viewing the public event page sees their own table highlighted.

## Constraints
- **Measurement display**: rooms in metres (1-decimal); table sizes in centimetres (matches existing labels).
- **Edit surface**: desktop mouse-driven UI in v1. Touch/mobile editing isn't required.
- **Performance envelope**: a few hundred tables per event; no special work required.
