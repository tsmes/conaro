"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveFloorPlan } from "@/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan-actions";
import { FloorPlanCanvasDynamic } from "./floor-plan-canvas-dynamic";
import { FloorPlanSidebar } from "./floor-plan-sidebar";
import {
  AssignArtistDialog,
  type AcceptedArtistEntry,
} from "./assign-artist-dialog";
import type {
  FloorPlan,
  FloorPlanTable,
  TableSizeOption,
} from "@/lib/db/schema/events";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";

const SAVE_DEBOUNCE_MS = 500;

interface FloorPlanEditorProps {
  eventId: string;
  initialPlan: ResolvedFloorPlan | null;
  tableSizeOptions: TableSizeOption[];
  acceptedArtists: AcceptedArtistEntry[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function toRawPlan(resolved: ResolvedFloorPlan | null): FloorPlan {
  if (!resolved) return { rooms: [], tables: [] };
  return {
    rooms: resolved.rooms,
    tables: resolved.tables.map((t) => ({
      id: t.id,
      label: t.label,
      tableSizeOptionId: t.tableSizeOptionId,
      x: t.x,
      y: t.y,
      assignedApplicationId: t.assignedApplicationId,
    })),
  };
}

// Builds a resolved view of the raw plan by looking up each table's
// assignedApplicationId against the accepted-artists catalog. Used only
// for the canvas (so it can display artist names without a server round
// trip between saves).
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
  };
}

export function FloorPlanEditor({
  eventId,
  initialPlan,
  tableSizeOptions,
  acceptedArtists,
}: FloorPlanEditorProps) {
  const [plan, setPlan] = useState<FloorPlan>(() => toRawPlan(initialPlan));
  const [assignTableId, setAssignTableId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPlan = useRef<FloorPlan>(plan);
  latestPlan.current = plan;

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    timerRef.current = setTimeout(() => {
      const snapshot = latestPlan.current;
      startTransition(async () => {
        const form = new FormData();
        form.set("eventId", eventId);
        form.set("floorPlan", JSON.stringify(snapshot));
        const result = await saveFloorPlan({}, form);
        if (result.success) {
          setStatus("saved");
          setErrorMsg(null);
        } else {
          setStatus("error");
          setErrorMsg(result.error ?? "Save failed");
        }
      });
    }, SAVE_DEBOUNCE_MS);
  }, [eventId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handlePlanChange(next: FloorPlan) {
    setPlan(next);
    scheduleSave();
  }

  function handleAssign(applicationId: string | null) {
    if (!assignTableId) return;
    const next: FloorPlan = {
      ...plan,
      tables: plan.tables.map((t) =>
        t.id === assignTableId
          ? { ...t, assignedApplicationId: applicationId }
          : t
      ),
    };
    handlePlanChange(next);
  }

  const resolvedForCanvas = resolvePlan(plan, acceptedArtists);
  const dialogTable: FloorPlanTable | null = assignTableId
    ? plan.tables.find((t) => t.id === assignTableId) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="text-muted-foreground">
          Drag tables to place them. Click the pencil icon next to a table
          to assign an accepted artist. Changes save automatically.
        </p>
        <SaveIndicator status={status} isPending={isPending} error={errorMsg} />
      </div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <FloorPlanCanvasDynamic
            plan={resolvedForCanvas}
            tableSizeOptions={tableSizeOptions}
            editable
            onChange={handlePlanChange}
          />
        </div>
        <FloorPlanSidebar
          eventId={eventId}
          plan={plan}
          tableSizeOptions={tableSizeOptions}
          onChange={handlePlanChange}
          onSelectTable={(id) => setAssignTableId(id)}
        />
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
  if (status === "saving" || isPending) {
    return <span className="text-muted-foreground">Saving…</span>;
  }
  if (status === "saved") {
    return <span className="text-muted-foreground">Saved</span>;
  }
  if (status === "error") {
    return (
      <span className="text-destructive" title={error ?? undefined}>
        Save failed
      </span>
    );
  }
  return null;
}
