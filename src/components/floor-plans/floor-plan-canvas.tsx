"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";

const GRID_CM = 100;
const DEFAULT_ROOM_SIZE_CM = { widthCm: 1000, heightCm: 700 };

interface FloorPlanCanvasProps {
  // Resolved plan for read-side rendering (assignment → artist name).
  plan: ResolvedFloorPlan | null;
  // Only tables belonging to the active room render. When null and the
  // plan has rooms, nothing renders; when the plan has no rooms, the
  // empty-state placeholder takes over.
  activeRoomId: string | null;
  // Event's size catalog, used to render each table at its real-world
  // dimensions.
  tableSizeOptions: TableSizeOption[];
  editable: boolean;
  onChange?: (next: FloorPlan) => void;
  // Highlight the matching table with a violet outline ("you are
  // here" marker on the public event page).
  highlightApplicationId?: string;
}

export function FloorPlanCanvas({
  plan,
  activeRoomId,
  tableSizeOptions,
  editable,
  onChange,
  highlightApplicationId,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeRoom =
    plan?.rooms.find((r) => r.id === activeRoomId) ?? null;

  const viewportCm = activeRoom
    ? { widthCm: activeRoom.widthCm, heightCm: activeRoom.heightCm }
    : DEFAULT_ROOM_SIZE_CM;

  const scale = containerWidth / viewportCm.widthCm;
  const stageWidth = containerWidth;
  const stageHeight = viewportCm.heightCm * scale;

  const sizeById = useMemo(
    () => new Map(tableSizeOptions.map((s) => [s.id, s])),
    [tableSizeOptions]
  );

  function handleTableDragEnd(
    tableId: string,
    stageXPx: number,
    stageYPx: number
  ) {
    if (!plan || !onChange) return;
    const newXCm = Math.max(0, Math.round(stageXPx / scale));
    const newYCm = Math.max(0, Math.round(stageYPx / scale));
    const nextTables = plan.tables.map((t) => {
      const raw = {
        id: t.id,
        label: t.label,
        tableSizeOptionId: t.tableSizeOptionId,
        roomId: t.roomId,
        x: t.x,
        y: t.y,
        assignedApplicationId: t.assignedApplicationId,
      };
      if (t.id !== tableId) return raw;
      return { ...raw, x: newXCm, y: newYCm };
    });
    onChange({ rooms: plan.rooms, tables: nextTables });
  }

  const tablesInRoom =
    activeRoomId && plan
      ? plan.tables.filter((t) => t.roomId === activeRoomId)
      : [];

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border border-border bg-background"
    >
      {!activeRoom ? (
        <div
          className="flex items-center justify-center p-12 text-center text-sm text-muted-foreground"
          style={{ minHeight: 360 }}
        >
          {(plan?.rooms.length ?? 0) === 0
            ? "Add your first room in the sidebar."
            : "Select a room to view its layout."}
        </div>
      ) : (
        <Stage width={stageWidth} height={stageHeight}>
          <Layer>
            <Rect
              x={0}
              y={0}
              width={viewportCm.widthCm * scale}
              height={viewportCm.heightCm * scale}
              fill="rgba(255,255,255,0.6)"
              stroke="#4b5563"
              strokeWidth={2}
            />
            <GridBackground
              widthCm={viewportCm.widthCm}
              heightCm={viewportCm.heightCm}
              scale={scale}
            />
          </Layer>
          <Layer>
            {tablesInRoom.map((table) => {
              const size = sizeById.get(table.tableSizeOptionId);
              if (!size || !size.widthCm || !size.depthCm) return null;
              const highlight =
                highlightApplicationId &&
                table.assignment?.applicationId === highlightApplicationId;
              const assigned = table.assignment !== null;
              return (
                <Group
                  key={table.id}
                  x={table.x * scale}
                  y={table.y * scale}
                  draggable={editable}
                  onDragEnd={(e) =>
                    handleTableDragEnd(table.id, e.target.x(), e.target.y())
                  }
                >
                  <Rect
                    width={size.widthCm * scale}
                    height={size.depthCm * scale}
                    fill={assigned ? "#fde68a" : "#e5e7eb"}
                    stroke={highlight ? "#7c3aed" : "#374151"}
                    strokeWidth={highlight ? 3 : 1.5}
                    cornerRadius={4}
                  />
                  <Text
                    x={6}
                    y={6}
                    text={table.label}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#111827"
                  />
                  <Text
                    x={6}
                    y={20}
                    text={
                      table.assignment
                        ? table.assignment.artistDisplayName
                        : "available"
                    }
                    fontSize={10}
                    fill={table.assignment ? "#111827" : "#6b7280"}
                    width={size.widthCm * scale - 12}
                    ellipsis
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function GridBackground({
  widthCm,
  heightCm,
  scale,
}: {
  widthCm: number;
  heightCm: number;
  scale: number;
}) {
  const lines: React.ReactNode[] = [];
  for (let x = GRID_CM; x < widthCm; x += GRID_CM) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x * scale, 0, x * scale, heightCm * scale]}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    );
  }
  for (let y = GRID_CM; y < heightCm; y += GRID_CM) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y * scale, widthCm * scale, y * scale]}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    );
  }
  return <>{lines}</>;
}

export default FloorPlanCanvas;
