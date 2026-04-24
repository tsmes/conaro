"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";

const GRID_MINOR_CM = 10;
const GRID_MAJOR_CM = 100;
const DEFAULT_VIEWPORT_CM = { widthCm: 1200, heightCm: 800 };

interface FloorPlanCanvasProps {
  // Resolved plan for read-side rendering (assignment → artist name).
  plan: ResolvedFloorPlan | null;
  // Event's size catalog, keyed by id, used to render each table at its
  // real-world dimensions.
  tableSizeOptions: TableSizeOption[];
  // Editable mode enables drag + fires onChange on drop. Read-only mode
  // keeps every shape static.
  editable: boolean;
  // Fires with the updated FloorPlan after a table has been moved.
  onChange?: (next: FloorPlan) => void;
  // Highlight this application's table with a coloured outline (used for
  // the "you are here" marker on the public event page).
  highlightApplicationId?: string;
}

function computeViewport(plan: ResolvedFloorPlan | null): {
  widthCm: number;
  heightCm: number;
} {
  if (!plan || plan.rooms.length === 0) return DEFAULT_VIEWPORT_CM;
  let maxX = 0;
  let maxY = 0;
  for (const room of plan.rooms) {
    maxX = Math.max(maxX, room.x + room.widthCm);
    maxY = Math.max(maxY, room.y + room.heightCm);
  }
  return {
    widthCm: Math.max(maxX + 50, DEFAULT_VIEWPORT_CM.widthCm),
    heightCm: Math.max(maxY + 50, DEFAULT_VIEWPORT_CM.heightCm),
  };
}

export function FloorPlanCanvas({
  plan,
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

  const viewport = useMemo(() => computeViewport(plan), [plan]);
  const scale = containerWidth / viewport.widthCm;
  const stageWidth = containerWidth;
  const stageHeight = viewport.heightCm * scale;

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
    const newXCm = Math.round(stageXPx / scale);
    const newYCm = Math.round(stageYPx / scale);
    // Storage shape is the raw FloorPlanTable (no resolved `assignment`).
    const nextTables = plan.tables.map((t) => {
      const raw = {
        id: t.id,
        label: t.label,
        tableSizeOptionId: t.tableSizeOptionId,
        x: t.x,
        y: t.y,
        assignedApplicationId: t.assignedApplicationId,
      };
      if (t.id !== tableId) return raw;
      return { ...raw, x: newXCm, y: newYCm };
    });
    onChange({ rooms: plan.rooms, tables: nextTables });
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border border-border bg-background"
    >
      <Stage width={stageWidth} height={stageHeight}>
        <Layer>
          <GridBackground
            widthCm={viewport.widthCm}
            heightCm={viewport.heightCm}
            scale={scale}
          />
        </Layer>
        <Layer>
          {plan?.rooms.map((room) => (
            <Group key={room.id}>
              <Rect
                x={room.x * scale}
                y={room.y * scale}
                width={room.widthCm * scale}
                height={room.heightCm * scale}
                fill="rgba(255,255,255,0.6)"
                stroke="#4b5563"
                strokeWidth={2}
              />
              <Text
                x={room.x * scale + 8}
                y={room.y * scale + 6}
                text={`${room.name}  ·  ${(room.widthCm / 100).toFixed(1)} × ${(
                  room.heightCm / 100
                ).toFixed(1)} m`}
                fontSize={12}
                fontStyle="bold"
                fill="#374151"
              />
            </Group>
          ))}
        </Layer>
        <Layer>
          {plan?.tables.map((table) => {
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
                  fill={
                    table.assignment ? "#111827" : "#6b7280"
                  }
                  width={size.widthCm * scale - 12}
                  ellipsis
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
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
  for (let x = 0; x <= widthCm; x += GRID_MINOR_CM) {
    const isMajor = x % GRID_MAJOR_CM === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x * scale, 0, x * scale, heightCm * scale]}
        stroke={isMajor ? "#d1d5db" : "#f3f4f6"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
  }
  for (let y = 0; y <= heightCm; y += GRID_MINOR_CM) {
    const isMajor = y % GRID_MAJOR_CM === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y * scale, widthCm * scale, y * scale]}
        stroke={isMajor ? "#d1d5db" : "#f3f4f6"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
  }
  return <>{lines}</>;
}

// Default export so it works with next/dynamic.
export default FloorPlanCanvas;
