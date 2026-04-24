# Implementation Plan: Floor planner (v1)

Spec: `.claude/plans/floor-planner-spec.md`

## Technical Decisions

- **Rendering library: `react-konva` + `konva`**. Mature 2D toolkit with first-class drag/hit-test support. Chosen over plain SVG (hand-rolled drag complexity), `tldraw` (oversized whiteboard), and raw canvas (most code for least gain). Client-only component; mounted via `next/dynamic({ ssr: false })` so the server never touches Konva.
- **Persistence: JSONB column `events.floor_plan`** with a `FloorPlan` TypeScript interface. Chosen over three separate tables because the plan is event-bound, always read-as-a-whole, and cross-event queries aren't a v1 need. Matches the existing `tableSizeOptions` / `amenities` / `fieldRequirements` pattern.
- **`TableSizeOption` gains optional `widthCm` + `depthCm`**. Extends the existing JSONB shape, no DB migration for the existing rows needed. Floor planner refuses to use a size that lacks numeric dimensions; event editor UI prompts to fill them in.
- **Assignment source of truth: `tables[].assignedApplicationId`** on the plan. Server-side save validates that every referenced application belongs to this event and has `status === "accepted"`.
- **Save strategy: debounced full-plan save (500 ms)** on each meaningful mutation (drag drop, add, delete, assign). No explicit save button. The whole plan goes in every time — simplest conflict model; v1 is single-editor anyway.
- **Server actions live in** `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan-actions.ts`. One action (`saveFloorPlan`) takes a JSON body.
- **Read helper lives in** `src/lib/floor-plans/queries.ts`. Resolves `assignedApplicationId` → `{artistDisplayName, requestedTableSizeOptionId}` in a batched join so the view has everything it needs in one pass.
- **Canvas guardrails**: grid background (10 cm minor / 100 cm major), no zoom/pan, auto-fit to the largest extent of all rooms, integer-cm positions, no room-containment constraint on table drags, no rotation.
- **Tests**: integration for queries + server action; jsdom for the non-canvas UI pieces (sidebar, assignment dialog, "Set dimensions" prompt). Canvas itself is covered by the manual-testing pass per the workflow.

## Tasks

### 1. Extend `TableSizeOption` with structured `widthCm` + `depthCm` ✅

Adds the numeric fields to the type, Zod schema, event editor UI, and event-form test fixtures. Required infrastructure for every later task.

**Requirements:** REQ-7 (partial — establishes the schema side; the planner-side "Set dimensions" prompt lives in task 8).

**Files:**
- `src/lib/db/schema/events.ts` — extend `TableSizeOption` with `widthCm?: number` + `depthCm?: number`.
- `src/lib/validations/convention.ts` — extend the `z.object` inside `tableSizeOptions.pipe(z.array(...))` with `widthCm: z.number().int().min(1).max(1000).optional()` and matching `depthCm`. Same cap for both. Numbers, cm.
- `src/components/conventions/event-form.tsx` — in `TableSizeOptionsEditor`, add two numeric inputs per row (labels "Width (cm)" and "Depth (cm)"). Local state already serialises via the hidden input, so the shape change flows through `JSON.stringify(options)`.
- `__tests__/components/event-form.test.tsx` — extend existing event-form test to mount with a table size that has widthCm+depthCm and verify the hidden input carries them.

**Approach:**
- Keep `dimensions` (free text) — organizers may still type "120x80 cm" for display; numeric fields are what the planner consumes.
- Optional in Zod + TypeScript so existing events (with sizes lacking the numbers) don't immediately become invalid.

**Verification:** `npm run build` green; `npm test -- event-form` green.
**Depends on:** none.

### 2. Add `events.floor_plan` JSONB column + `FloorPlan` type ✅

Persistence infrastructure for the plan itself.

**Requirements:** Infrastructure (enables REQ-2..6, REQ-8..11).

**Files:**
- `src/lib/db/schema/events.ts` — export `interface FloorPlan { rooms: FloorPlanRoom[]; tables: FloorPlanTable[] }` plus the two row interfaces. Add `floorPlan: jsonb("floor_plan").$type<FloorPlan>()` nullable column to the `events` table.
- `src/lib/db/migrations/0018_<slug>.sql` — auto-generated `ALTER TABLE events ADD COLUMN floor_plan jsonb;`.
- `__tests__/integration/floor-plan-schema.test.ts` — new: insert an event with `floorPlan: null`, update with a populated plan, read it back, assert the shape round-trips.

**Approach:**
- Use plain numeric fields (cm integers). IDs for rooms and tables are organizer-generated via `crypto.randomUUID()` on the client at add time.
- Nullable column — an event without a plan returns null from the query.

**Verification:** `npm run db:generate` produces the migration; `npm run db:migrate:test` applies cleanly; integration test green.
**Depends on:** none (parallelizable with task 1).

### 3. Read helper — `getFloorPlanForEvent` ✅

Loads the plan + resolves assignments to artist info in one query pass.

**Requirements:** Infrastructure (enables REQ-8, REQ-9).

**Files:**
- `src/lib/floor-plans/queries.ts` — new. Exports `getFloorPlanForEvent(eventId: string): Promise<ResolvedFloorPlan | null>`. Steps: (a) fetch `events.floorPlan` where id = eventId. (b) If null, return null. (c) Collect all non-null `assignedApplicationId` values. (d) Single `select` on applications inner-joined to profiles, filtered by `applications.id in (…) AND applications.eventId = eventId`. (e) Map back to a `ResolvedFloorPlan` shape where each table has `{…, assignment: {applicationId, artistDisplayName, requestedTableSizeOptionId} | null}`.
- `__tests__/integration/floor-plan-queries.test.ts` — new. Cases: event with no plan → null; event with plan and no assignments → plan with `assignment: null` on every table; event with assignments → resolved display names + requested size ids; assignment referencing a cross-event application → filtered out (defensive — should never happen but worth pinning).

**Verification:** Integration test green.
**Depends on:** 2.

### 4. Server action — `saveFloorPlan` ✅

Single action that accepts the whole plan as a JSON body and persists it with Zod validation + event ownership + assignment integrity.

**Requirements:** Infrastructure (enables REQ-4, REQ-5, REQ-10).

**Files:**
- `src/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan-actions.ts` — new. `"use server"`. Exports `saveFloorPlan(_prev, formData)`. Zod schema validates the full `FloorPlan` shape: `rooms` array of `{id, name(1-60), x(int ≥0), y, widthCm(≥10), heightCm}`; `tables` array of `{id, label(1-10), tableSizeOptionId, x, y, assignedApplicationId|null}`. Auth: organizer + event ownership via `getOrganizerEvent`. Post-parse validations: (a) every `tableSizeOptionId` matches an entry in `event.tableSizeOptions` that has both widthCm and depthCm filled; (b) every non-null `assignedApplicationId` resolves to an application whose `eventId == this event` and `status === "accepted"`; (c) no two tables in the plan share the same `assignedApplicationId`. Update `events.floor_plan = <parsed plan>`. Revalidate `/conventions/manage/events/${eventId}` + `/events/${eventId}`.
- `__tests__/integration/floor-plan-save.test.ts` — new. Happy path, invalid-assignment (non-accepted status), cross-event application rejected, unknown tableSizeOptionId rejected, non-owner organizer rejected, duplicate assignment rejected.

**Verification:** Integration test green.
**Depends on:** 2, 3.

### 5. Install react-konva + scaffold `<FloorPlanCanvas>` client component ✅ (shipped with 6 + 7)

Gets the canvas mounting at all. No interactivity yet.

**Requirements:** Infrastructure (enables REQ-1).

**Files:**
- `package.json` — pin `react-konva` + `konva` at exact versions.
- `src/components/floor-plans/floor-plan-canvas.tsx` — new. `"use client"`. Takes props `{plan: ResolvedFloorPlan | null, editable: boolean}` (editable just reserved for now). Computes auto-fit scale from max-extent rooms. Renders `<Stage>` + `<Layer>` + a grid background. Empty plan shows the grid over a stated default viewport (e.g. 1000 × 600 cm).
- `src/components/floor-plans/floor-plan-canvas-dynamic.tsx` — new. `export default dynamic(() => import("./floor-plan-canvas"), { ssr: false, loading: () => <div className="aspect-[5/3] w-full rounded-lg bg-muted animate-pulse" /> })`.
- `__tests__/components/floor-plan-canvas.test.tsx` — smoke test that the dynamic wrapper mounts without throwing (in jsdom, Konva will render to a fallback canvas impl — the test just asserts no runtime error).

**Approach:**
- Keep Konva imports strictly inside the client component file so no server bundle pulls them in. The dynamic wrapper is what pages import.
- Auto-fit scale: pixels-per-cm = `min(containerWidthPx / maxContentWidthCm, containerHeightPx / maxContentHeightCm)` with a sensible minimum.

**Verification:** `npm run build` green (including verifying Konva doesn't SSR); smoke test passes; manual: mount the component on a scratch page and see an empty grid.
**Depends on:** none (parallelizable with 1–4).

### 6. `<FloorPlanCanvas>` renders rooms + tables (read-only) ✅

Extend the canvas to actually draw what's in the plan.

**Requirements:** REQ-2, REQ-3 (visual side), REQ-11.

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx` — extend to render: a `<Rect>` per room with a thick border + filled label ("Main hall · 8.5 m × 5.0 m"); a `<Rect>` per table with size-derived fill + border, the label ("T1") centred, and — when `assignment` is present — the artist's display name below the label. Unassigned tables render with a muted fill + "available" label.

**Approach:**
- Compute visual coords in pixels: `xPx = xCm * scale`.
- Rooms and tables on the same coordinate space — no parenting. (See "Canvas guardrails" in Technical Decisions.)
- Label placement: `Konva.Text` inside the rect via absolute positioning; truncation on overflow isn't required for v1 (labels short enough).

**Verification:** Smoke test passes; manual: mount with a hand-crafted plan (two rooms, five tables) and visually verify each renders at the right size.
**Depends on:** 5.

### 7. `<FloorPlanCanvas>` drag-to-move tables ✅

Tables become draggable, drop position snaps to integer cm, fires an `onChange(plan)` callback with the updated plan.

**Requirements:** REQ-4.

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx` — extend with prop `onChange?: (plan: FloorPlan) => void` (NOT resolved — just raw). Gate `<Rect>.draggable` on `editable`. On `onDragEnd`, round x/y to integers, compose an updated plan, call onChange.
- (No jsdom test — drag requires a real canvas; covered in manual testing.)

**Approach:**
- `onDragEnd(e)` reads `e.target.x()` / `e.target.y()` (these are in stage px) and divides by `scale` to get cm.
- Use `Math.round` on x/y; floor plan stays in integer cm.
- No constraint to room bounds — v1 can let tables stray; organizer self-corrects.

**Verification:** Manual: drag a table in the editor, see it update position. (Persistence comes in task 10.)
**Depends on:** 6.

### 8. Sidebar — add/delete rooms + tables + `Set dimensions` prompt ✅

The organizer's control panel next to the canvas. Not draggable to insert; add-on-click.

**Requirements:** REQ-2, REQ-3, REQ-7 (prompt side), REQ-10.

**Files:**
- `src/components/floor-plans/floor-plan-sidebar.tsx` — new. `"use client"`. Props: `{plan: FloorPlan, tableSizeOptions: TableSizeOption[], onChange: (next: FloorPlan) => void, onSelectTable: (tableId: string) => void}`. Sections:
  - **Add room** button → prompts for `name` + `widthM` + `heightM`, creates a new room at `{x: 0, y: 0}`.
  - **Add table** select with one option per `tableSizeOptions` entry. Entries whose widthCm/depthCm are missing are listed but disabled with an inline "Set dimensions" link pointing to the event editor (`/conventions/manage/events/${eventId}`). Picking an enabled option appends a table at `{x: 0, y: 0}`, auto-generates an incrementing label (`T${tables.length + 1}`), emits onChange.
  - **Rooms list** with name + size + delete button.
  - **Tables list** with label + size name + assigned artist (if any) + delete button + "Assign" button (fires `onSelectTable`).
- `__tests__/components/floor-plan-sidebar.test.tsx` — jsdom. Cases: add-room flow; add-table with an enabled size; "Set dimensions" link surfaces when the picked option has no widthCm; delete-room and delete-table emit the right onChange payload.

**Approach:**
- Add-room uses a small inline form (or a modal) — simpler to start inline.
- Label auto-generation: `T${nextAvailableNumber}` where we pick the lowest positive integer not already used — handles deletion gaps.

**Verification:** Component test green; manual: add/delete flows work.
**Depends on:** 1 (needs the widthCm/depthCm fields to gate the "Set dimensions" prompt), 2 (needs the FloorPlan shape).

### 9. Assign-artist dialog ✅

Click a table → pick an accepted artist → mismatch warning if sizes don't match.

**Requirements:** REQ-5.

**Files:**
- `src/components/floor-plans/assign-artist-dialog.tsx` — new. `"use client"`. Props: `{open, onOpenChange, table, acceptedArtists: Array<{applicationId, displayName, requestedTableSizeOptionId}>, onAssign: (applicationId: string | null) => void}`. Uses the existing `<Dialog>` primitive. Lists accepted artists; each row shows a "mismatch" badge if their `requestedTableSizeOptionId !== table.tableSizeOptionId`. Picking one fires onAssign. A "Clear assignment" button fires `onAssign(null)`. Disables artists who are already assigned to a different table in the current plan (prevents double-assignment).
- `__tests__/components/assign-artist-dialog.test.tsx` — jsdom. Cases: lists expected artists; mismatch badge renders when size differs; assigning fires onAssign with the right id; already-assigned artists disabled.

**Verification:** Component test green; manual: assignment flow end-to-end.
**Depends on:** 8 (sidebar is what opens the dialog via `onSelectTable`).

### 10. Wire the whole `<FloorPlanEditor>` into the organizer event-management page ✅

The top-level client component that hosts canvas + sidebar + dialog, threads state, debounces the save.

**Requirements:** REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-10.

**Files:**
- `src/components/floor-plans/floor-plan-editor.tsx` — new. `"use client"`. Props: `{eventId, initialPlan: ResolvedFloorPlan | null, tableSizeOptions, acceptedArtists}`. Holds `plan: FloorPlan` local state; on every mutation, schedules a debounced (500 ms) call to `saveFloorPlan` via a FormData wrapper. Displays a tiny "Saving…" / "Saved" / "Save failed" indicator.
- `src/app/(authenticated)/conventions/manage/events/[eventId]/page.tsx` — server component additions:
  - Fetch `getFloorPlanForEvent(event.id)`.
  - Fetch accepted-artists list (applications inner-joined to profiles, filtered by eventId + status=accepted).
  - Render a new Card above the Details form (alongside the Announcements + Inbox cards) gated on `event.status === "results_published"` and containing `<FloorPlanEditor …/>`.

**Approach:**
- Debounce: a `useRef<NodeJS.Timeout | null>` + `useEffect` cleanup. Simple, no library needed.
- On save failure, keep local state as is, show the error; don't roll back visual state.
- The editor reconciles `initialPlan` (resolved) vs the inner `FloorPlan` shape by extracting the `FloorPlan` from the resolved form; the resolved form is only used for display.

**Verification:** Manual: create rooms, place tables, drag them, assign artists, reload the page, verify the plan persists.
**Depends on:** 3, 4, 7, 8, 9.

### 11. Public read-only render + "you are here"

Mount a read-only `<FloorPlanCanvas>` on the public event page after results publish; highlight the viewing artist's own table.

**Requirements:** REQ-8, REQ-9.

**Files:**
- `src/components/floor-plans/floor-plan-canvas.tsx` — extend to accept `highlightApplicationId?: string` and draw a coloured outline around the matching table (if present). No interactivity when `editable={false}`.
- `src/app/(public)/events/[eventId]/page.tsx` — if `event.status === "results_published"` and a plan exists, add a new `SectionCard` labelled "Floor plan". Mount `<FloorPlanCanvasDynamic>` with `plan`, `editable={false}`. If the viewer is an accepted artist, compute their `assignedApplicationId` from their own application row and pass it as `highlightApplicationId`.

**Approach:**
- The "you are here" match: the public page already knows `ownApplicationId` for the signed-in artist branch; thread it through.
- The floor plan is hidden entirely when the event status isn't `results_published` (matches other post-publish surfaces like announcements).

**Verification:** Manual: view the event page as a public visitor (plan visible, no highlight); as the accepted artist (plan visible, own table highlighted); as a non-accepted signed-in artist (plan visible, no highlight).
**Depends on:** 10.

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (canvas at real-world scale) | 5, 10 |
| REQ-2 (create rooms) | 2, 8, 10 |
| REQ-3 (place tables from tableSizeOptions) | 1, 8, 10 |
| REQ-4 (drag to reposition) | 7, 10 |
| REQ-5 (assign accepted artist + mismatch warning) | 4, 9, 10 |
| REQ-6 (unassigned tables allowed) | 2, 4 (validation allows null) |
| REQ-7 (widthCm/depthCm + "Set dimensions" prompt) | 1, 8 |
| REQ-8 (visible on public event page post-publish) | 3, 11 |
| REQ-9 ("you are here" highlight) | 11 |
| REQ-10 (delete rooms / tables / assignments) | 8, 9, 10 |
| REQ-11 (unassigned tables render as empty / available) | 6 |

## Risks

- **Konva bundle size on the organizer event page.** ~120 KB gzipped pulled in for any organizer visiting `/conventions/manage/events/[eventId]`. Mitigated by `next/dynamic({ssr: false})` and by only mounting when the event is `results_published`. Still a meaningful increase; worth confirming in a production build.
- **Konva in jsdom.** Konva requires a real canvas context. jsdom's canvas stub usually works for mount (Konva detects and falls back) but complex interactions don't run. The plan deliberately keeps component tests on non-canvas pieces; the canvas itself is covered by manual testing.
- **"Set dimensions" prompt coupling.** The sidebar's gate on widthCm/depthCm depends on the event editor having the new fields (task 1). If task 8 ships before task 1 is merged the gate misbehaves — task ordering prevents this, but it's worth a test case.
- **Debounced save vs rapid edits.** A user who drags, deletes, and assigns in quick succession generates multiple mutations within 500 ms. Debounce-per-plan means only the last plan is saved — which is correct. But an in-flight save arriving AFTER a later local edit could stale-overwrite (no optimistic lock). Single-editor v1 avoids this in practice; flag for future if multi-editor becomes real.
- **Assignment one-to-one invariant.** Enforced server-side in task 4 (no two tables share an `assignedApplicationId`) and client-side via the assignment dialog's "already assigned" filter (task 9). Both sides must stay in sync — a missing client-side check would just produce an error toast on save, which is acceptable but worse UX.
- **Public visibility of artist names.** All accepted artists' names are visible to anyone visiting the public event page. This matches the spec's "public" visibility choice, but note: an artist with a stage name vs real name may not want their real name on the floor plan. We show `displayName` (their chosen alias) so this is fine.
- **Mobile view of the plan.** Read-only rendering on phones — the plan might be cramped on small screens. Not a v1 requirement, but users will try it. Konva supports pinch-zoom by default; confirm it works OR accept the limitation and flag.
