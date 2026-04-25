"use client";

import { useState } from "react";
import { FloorPlanCanvasDynamic } from "./floor-plan-canvas-dynamic";
import type { TableSizeOption } from "@/lib/db/schema/events";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";

interface PublicFloorPlanViewProps {
  plan: ResolvedFloorPlan;
  tableSizeOptions: TableSizeOption[];
  highlightApplicationId?: string;
  /** When true, the highlighted table briefly pulses on mount.
   *  Used by the "Show me my table" entry point. */
  pulseHighlight?: boolean;
}

export function PublicFloorPlanView({
  plan,
  tableSizeOptions,
  highlightApplicationId,
  pulseHighlight = false,
}: PublicFloorPlanViewProps) {
  // If the viewer's own table lives in a specific room, open that one
  // first — spares them a click to find "you are here".
  const ownTable = highlightApplicationId
    ? plan.tables.find(
        (t) => t.assignment?.applicationId === highlightApplicationId
      )
    : null;
  const defaultRoomId = ownTable?.roomId ?? plan.rooms[0]?.id ?? null;
  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    defaultRoomId
  );

  if (plan.rooms.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {plan.rooms.map((room) => {
          const active = room.id === activeRoomId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => setActiveRoomId(room.id)}
              className={
                "rounded-full border px-3 py-1 text-sm transition-colors " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted")
              }
            >
              {room.name}
            </button>
          );
        })}
      </div>
      <FloorPlanCanvasDynamic
        plan={plan}
        activeRoomId={activeRoomId}
        tableSizeOptions={tableSizeOptions}
        editable={false}
        highlightApplicationId={highlightApplicationId}
        pulseHighlight={pulseHighlight}
      />
    </div>
  );
}
