"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveFloorPlan } from "@/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan-actions";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { FloorPlanCanvasDynamic } from "./floor-plan-canvas-dynamic";
import { FloorPlanSidebar } from "./floor-plan-sidebar";
import { RoomSwitcher } from "./room-switcher";
import {
  AssignArtistDialog,
  type AcceptedArtistEntry,
} from "./assign-artist-dialog";
import { EditTableDialog } from "./edit-table-dialog";
import { EditLabelDialog } from "./edit-label-dialog";
import type {
  FloorPlan,
  FloorPlanTable,
  TableSizeOption,
} from "@/lib/db/schema/events";
import { rotatedAabbExtents } from "@/lib/floor-plans/geometry";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";

const SAVE_DEBOUNCE_MS = 500;

interface FloorPlanEditorProps {
  eventId: string;
  initialPlan: ResolvedFloorPlan | null;
  tableSizeOptions: TableSizeOption[];
  acceptedArtists: AcceptedArtistEntry[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export type FloorPlanViewMode = "design" | "populate";

const VIEW_MODE_OPTIONS = [
  { value: "design" as const, label: "Design" },
  { value: "populate" as const, label: "Populate" },
];

function toRawPlan(resolved: ResolvedFloorPlan | null): FloorPlan {
  if (!resolved) return { rooms: [], tables: [], labels: [] };
  return {
    rooms: resolved.rooms,
    tables: resolved.tables.map((t) => ({
      id: t.id,
      label: t.label,
      tableSizeOptionId: t.tableSizeOptionId,
      roomId: t.roomId,
      rotationDeg: t.rotationDeg,
      x: t.x,
      y: t.y,
      assignedApplicationId: t.assignedApplicationId,
    })),
    labels: resolved.labels,
  };
}

function resolvePlan(
  plan: FloorPlan,
  artists: AcceptedArtistEntry[]
): ResolvedFloorPlan {
  const byId = new Map(artists.map((a) => [a.applicationId, a]));
  return {
    rooms: plan.rooms,
    tables: plan.tables.map((t) => {
      const match = t.assignedApplicationId
        ? byId.get(t.assignedApplicationId) ?? null
        : null;
      return {
        ...t,
        assignment: match
          ? {
              applicationId: match.applicationId,
              artistDisplayName: match.displayName,
              requestedTableSizeOptionId: match.requestedTableSizeOptionId,
            }
          : null,
      };
    }),
    labels: plan.labels ?? [],
  };
}

export function FloorPlanEditor({
  eventId,
  initialPlan,
  tableSizeOptions,
  acceptedArtists,
}: FloorPlanEditorProps) {
  const [plan, setPlan] = useState<FloorPlan>(() => toRawPlan(initialPlan));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    const rooms = toRawPlan(initialPlan).rooms;
    return rooms[0]?.id ?? null;
  });
  const [viewMode, setViewMode] = useState<FloorPlanViewMode>("populate");
  const [assignTableId, setAssignTableId] = useState<string | null>(null);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [addLabelOpen, setAddLabelOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether there's a save that hasn't been confirmed yet,
  // regardless of whether it's sitting in the debounce or already in
  // flight. Used by the beforeunload guard and the unmount flush.
  const pendingRef = useRef(false);
  const latestPlan = useRef<FloorPlan>(plan);
  latestPlan.current = plan;
  // Undo stack — most-recent-first. Bounded so we don't grow without
  // limit on heavy editing sessions.
  const historyRef = useRef<FloorPlan[]>([]);
  const UNDO_LIMIT = 50;

  const runSave = useCallback(
    async (snapshot: FloorPlan) => {
      const form = new FormData();
      form.set("eventId", eventId);
      form.set("floorPlan", JSON.stringify(snapshot));
      const result = await saveFloorPlan({}, form);
      return result;
    },
    [eventId]
  );

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = true;
    setStatus("saving");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const snapshot = latestPlan.current;
      startTransition(async () => {
        const result = await runSave(snapshot);
        pendingRef.current = false;
        if (result.success) {
          setStatus("saved");
          setErrorMsg(null);
        } else {
          setStatus("error");
          setErrorMsg(result.error ?? "Save failed");
        }
      });
    }, SAVE_DEBOUNCE_MS);
  }, [runSave]);

  // If the user navigates (back, tab change, tab close) while a debounced
  // save is still waiting, fire it synchronously so they don't lose the
  // last edit. The beforeunload handler only fires for full tab close /
  // reload; client-side Next.js route changes trigger the unmount cleanup.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!pendingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // Fire-and-forget: the fetch survives component unmount, which
        // is what we want — it's better to save an extra time than to
        // drop the user's last drag.
        if (pendingRef.current) {
          void runSave(latestPlan.current);
        }
      }
    };
  }, [runSave]);

  const handlePlanChange = useCallback(
    (next: FloorPlan) => {
      // Push the state we're leaving onto the undo stack BEFORE
      // applying the new one, so Ctrl+Z always returns to the last
      // user-visible state.
      historyRef.current.unshift(latestPlan.current);
      if (historyRef.current.length > UNDO_LIMIT) {
        historyRef.current.length = UNDO_LIMIT;
      }
      setPlan(next);
      setActiveRoomId((prev) => {
        if (!prev) return next.rooms[0]?.id ?? null;
        return next.rooms.some((r) => r.id === prev)
          ? prev
          : next.rooms[0]?.id ?? null;
      });
      scheduleSave();
    },
    [scheduleSave]
  );

  const undo = useCallback(() => {
    const previous = historyRef.current.shift();
    if (!previous) return;
    setPlan(previous);
    setActiveRoomId((prev) => {
      if (prev && previous.rooms.some((r) => r.id === prev)) return prev;
      return previous.rooms[0]?.id ?? null;
    });
    scheduleSave();
  }, [scheduleSave]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedTableId) return;
      const table = latestPlan.current.tables.find(
        (t) => t.id === selectedTableId
      );
      if (!table) return;
      const room = latestPlan.current.rooms.find(
        (r) => r.id === table.roomId
      );
      const size = tableSizeOptions.find(
        (s) => s.id === table.tableSizeOptionId
      );
      if (!room || !size?.widthCm || !size?.depthCm) return;
      const aabb = rotatedAabbExtents(
        size.widthCm,
        size.depthCm,
        table.rotationDeg
      );
      const centreX = table.x + size.widthCm / 2 + dx;
      const centreY = table.y + size.depthCm / 2 + dy;
      const clampedCx = Math.max(
        aabb.halfWidthCm,
        Math.min(room.widthCm - aabb.halfWidthCm, centreX)
      );
      const clampedCy = Math.max(
        aabb.halfDepthCm,
        Math.min(room.heightCm - aabb.halfDepthCm, centreY)
      );
      const newX = Math.round(clampedCx - size.widthCm / 2);
      const newY = Math.round(clampedCy - size.depthCm / 2);
      if (newX === table.x && newY === table.y) return;
      handlePlanChange({
        ...latestPlan.current,
        tables: latestPlan.current.tables.map((t) =>
          t.id === selectedTableId ? { ...t, x: newX, y: newY } : t
        ),
      });
    },
    [selectedTableId, tableSizeOptions, handlePlanChange]
  );

  // Keyboard shortcuts:
  //   Ctrl/Cmd+Z   → undo
  //   Arrow keys   → nudge the selected table by 1 cm
  //   Shift+Arrow  → nudge by 10 cm
  //   Esc          → deselect
  // Disabled while typing in a form field so dialog inputs still get
  // their native behaviour.
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }
    function handleKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          undo();
          return;
        }
      }
      if (e.key === "Escape") {
        setSelectedTableId(null);
        return;
      }
      if (!selectedTableId) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelected(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelected(step, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelected(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelected(0, step);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, selectedTableId, nudgeSelected]);

  function handleAssign(applicationId: string | null) {
    if (!assignTableId) return;
    handlePlanChange({
      ...plan,
      tables: plan.tables.map((t) =>
        t.id === assignTableId
          ? { ...t, assignedApplicationId: applicationId }
          : t
      ),
    });
  }

  function handleEditTable(next: {
    label: string;
    tableSizeOptionId: string;
    rotationDeg: number;
  }) {
    if (!editTableId) return;
    handlePlanChange({
      ...plan,
      tables: plan.tables.map((t) =>
        t.id === editTableId
          ? {
              ...t,
              label: next.label,
              tableSizeOptionId: next.tableSizeOptionId,
              rotationDeg: next.rotationDeg,
            }
          : t
      ),
    });
  }

  function handleAddLabel(text: string) {
    if (!activeRoomId) return;
    handlePlanChange({
      ...plan,
      labels: [
        ...(plan.labels ?? []),
        {
          id: crypto.randomUUID(),
          roomId: activeRoomId,
          text,
          x: 50,
          y: 50,
          rotationDeg: 0,
        },
      ],
    });
  }

  function handleEditLabelText(text: string) {
    if (!editingLabelId) return;
    handlePlanChange({
      ...plan,
      labels: (plan.labels ?? []).map((l) =>
        l.id === editingLabelId ? { ...l, text } : l
      ),
    });
  }

  const resolvedForCanvas = resolvePlan(plan, acceptedArtists);
  const dialogTable: FloorPlanTable | null = assignTableId
    ? plan.tables.find((t) => t.id === assignTableId) ?? null
    : null;
  const editingTable: FloorPlanTable | null = editTableId
    ? plan.tables.find((t) => t.id === editTableId) ?? null
    : null;
  const editingLabel = editingLabelId
    ? (plan.labels ?? []).find((l) => l.id === editingLabelId) ?? null
    : null;
  const activeRoom = plan.rooms.find((r) => r.id === activeRoomId) ?? null;
  const canClearPolygon =
    viewMode === "design" &&
    !!activeRoom?.vertices &&
    activeRoom.vertices.length >= 3;

  function handleClearPolygon() {
    if (!activeRoom) return;
    handlePlanChange({
      rooms: plan.rooms.map((r) => {
        if (r.id !== activeRoom.id) return r;
        // Strip the vertices field rather than setting to undefined so
        // the saved JSON stays clean.
        const next = { ...r };
        delete next.vertices;
        return next;
      }),
      tables: plan.tables,
      labels: plan.labels,
    });
  }

  return (
    <div className="space-y-4">
      <RoomSwitcher
        plan={plan}
        activeRoomId={activeRoomId}
        onActiveRoomChange={setActiveRoomId}
        onChange={handlePlanChange}
        rightSlot={
          <div className="flex items-center gap-3">
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={VIEW_MODE_OPTIONS}
              size="sm"
              aria-label="Editor mode"
            />
            {canClearPolygon && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearPolygon}
              >
                Clear polygon
              </Button>
            )}
            <SaveIndicator
              status={status}
              isPending={isPending}
              error={errorMsg}
            />
          </div>
        }
      />
      <div
        className={
          viewMode === "design"
            ? "grid items-start gap-6"
            : "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        }
      >
        <div>
          <FloorPlanCanvasDynamic
            plan={resolvedForCanvas}
            activeRoomId={activeRoomId}
            tableSizeOptions={tableSizeOptions}
            editable
            viewMode={viewMode}
            onChange={handlePlanChange}
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {viewMode === "populate" ? (
              <>
                Drag tables to place them, or click a table and use the
                arrow keys to nudge (hold Shift for 10&nbsp;cm steps).
                <kbd className="mx-1 rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘Z</kbd>
                undoes. Changes save automatically.
              </>
            ) : (
              <>
                Design the room shape — draw an outline for non-rectangular
                rooms, or leave blank to use the canvas dimensions as-is.
              </>
            )}
          </p>
        </div>
        {viewMode === "populate" && (
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            <FloorPlanSidebar
              eventId={eventId}
              plan={plan}
              activeRoomId={activeRoomId}
              tableSizeOptions={tableSizeOptions}
              acceptedArtists={acceptedArtists}
              onChange={handlePlanChange}
              onSelectTable={(id) => setAssignTableId(id)}
              onEditTable={(id) => setEditTableId(id)}
              onAddLabel={() => setAddLabelOpen(true)}
              onEditLabel={(id) => setEditingLabelId(id)}
            />
          </div>
        )}
      </div>
      <AssignArtistDialog
        open={dialogTable !== null}
        onOpenChange={(open) => {
          if (!open) setAssignTableId(null);
        }}
        table={dialogTable}
        acceptedArtists={acceptedArtists}
        tableSizeOptions={tableSizeOptions}
        plan={plan}
        onAssign={handleAssign}
      />
      <EditTableDialog
        open={editingTable !== null}
        onOpenChange={(open) => {
          if (!open) setEditTableId(null);
        }}
        table={editingTable}
        tableSizeOptions={tableSizeOptions}
        onSave={handleEditTable}
      />
      <EditLabelDialog
        open={addLabelOpen}
        onOpenChange={setAddLabelOpen}
        initialText={null}
        onSave={handleAddLabel}
      />
      <EditLabelDialog
        open={editingLabel !== null}
        onOpenChange={(open) => {
          if (!open) setEditingLabelId(null);
        }}
        initialText={editingLabel?.text ?? null}
        onSave={handleEditLabelText}
      />
    </div>
  );
}

function SaveIndicator({
  status,
  isPending,
  error,
}: {
  status: SaveStatus;
  isPending: boolean;
  error: string | null;
}) {
  const shown = status === "saving" || isPending
    ? "saving"
    : status === "error"
      ? "error"
      : status === "saved"
        ? "saved"
        : "idle";
  if (shown === "idle") return null;
  const text =
    shown === "saving" ? "Saving changes…"
      : shown === "saved" ? "All changes saved"
        : "Save failed";
  const classes =
    shown === "saving"
      ? "border-border bg-muted text-muted-foreground"
      : shown === "saved"
        ? "border-success/40 bg-success-container text-on-success-container"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  const dotClasses =
    shown === "saving"
      ? "animate-pulse bg-muted-foreground"
      : shown === "saved"
        ? "bg-success"
        : "bg-destructive";
  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium " +
        classes
      }
      title={shown === "error" ? error ?? undefined : undefined}
      aria-live="polite"
    >
      <span className={"size-2 rounded-full " + dotClasses} />
      {text}
    </span>
  );
}
