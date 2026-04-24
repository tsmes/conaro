"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";

const GRID_CM = 100;
const DEFAULT_ROOM_SIZE_CM = { widthCm: 1000, heightCm: 700 };

// Colour palette tuned against the Conaro theme. Stays muted so the
// plan reads as a drafting surface, not a painted diagram.
const COLORS = {
  backdrop: "#f6f7f9",
  roomFill: "#ffffff",
  roomStroke: "#cbd5e1",
  roomLabelBg: "#1f2937",
  roomLabelText: "#ffffff",
  gridLine: "#e6e8ec",
  gridOrigin: "#d1d5db",
  tableUnassignedFill: "#f1f5f9",
  tableUnassignedStroke: "#94a3b8",
  tableAssignedFill: "#dbeafe",
  tableAssignedStroke: "#3b82f6",
  tableShadow: "rgba(15, 23, 42, 0.12)",
  highlightGlow: "#8b5cf6",
  labelText: "#0f172a",
  labelPin: "#6366f1",
  hintText: "#64748b",
};

interface FloorPlanCanvasProps {
  plan: ResolvedFloorPlan | null;
  activeRoomId: string | null;
  tableSizeOptions: TableSizeOption[];
  editable: boolean;
  onChange?: (next: FloorPlan) => void;
  highlightApplicationId?: string;
  /** Outlines the selected table; arrow-key nudging in the parent
   *  moves it. */
  selectedTableId?: string | null;
  onSelectTable?: (id: string | null) => void;
}

type EdgeKey = "left" | "right" | "top" | "bottom";

export function FloorPlanCanvas({
  plan,
  activeRoomId,
  tableSizeOptions,
  editable,
  onChange,
  highlightApplicationId,
  selectedTableId,
  onSelectTable,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  // Per-table "last violated edge" memory. On the first drag that
  // crosses an edge we clamp the table back in and remember which
  // edge was hit; a second drag past the *same* edge is allowed
  // through (for overflow areas like hallways). Dragging back inside
  // — or crossing a different edge — resets the memory.
  const edgeMemoryRef = useRef<Map<string, EdgeKey>>(new Map());

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

  // Leave a small padding inside the stage so the room doesn't hug the
  // container edge — purely aesthetic but makes shadows + labels
  // breathe.
  const PADDING_PX = 16;
  const effectiveWidthPx = Math.max(0, containerWidth - PADDING_PX * 2);
  const scale = effectiveWidthPx / viewportCm.widthCm;
  const stageWidth = containerWidth;
  const stageHeight = viewportCm.heightCm * scale + PADDING_PX * 2;

  const sizeById = useMemo(
    () => new Map(tableSizeOptions.map((s) => [s.id, s])),
    [tableSizeOptions]
  );

  function handleTableDragEnd(
    tableId: string,
    centerStageXPx: number,
    centerStageYPx: number,
    sizeWidthCm: number,
    sizeDepthCm: number,
    rotationDeg: number
  ) {
    if (!plan || !onChange || !activeRoom) return;
    const rotated = rotationDeg === 90 || rotationDeg === 270;
    const effWidthCm = rotated ? sizeDepthCm : sizeWidthCm;
    const effDepthCm = rotated ? sizeWidthCm : sizeDepthCm;
    const centerXCm = (centerStageXPx - PADDING_PX) / scale;
    const centerYCm = (centerStageYPx - PADDING_PX) / scale;

    // Unclamped centre expressed as how far it's past each edge
    // (positive → outside, zero or negative → inside).
    const overLeft = effWidthCm / 2 - centerXCm;
    const overRight = centerXCm - (activeRoom.widthCm - effWidthCm / 2);
    const overTop = effDepthCm / 2 - centerYCm;
    const overBottom = centerYCm - (activeRoom.heightCm - effDepthCm / 2);

    // Pick the single dominant violated edge (largest overshoot).
    // Corner drags still pick one edge; the other is silently clamped.
    const overshoots: Array<[EdgeKey, number]> = [
      ["left", overLeft],
      ["right", overRight],
      ["top", overTop],
      ["bottom", overBottom],
    ];
    const [dominantEdge, dominantAmount] = overshoots.reduce(
      (acc, cur) => (cur[1] > acc[1] ? cur : acc),
      ["left", -Infinity] as [EdgeKey, number]
    );
    const violated = dominantAmount > 0;
    const rememberedEdge = edgeMemoryRef.current.get(tableId);
    const allowOutside = violated && rememberedEdge === dominantEdge;

    let finalCenterX = centerXCm;
    let finalCenterY = centerYCm;
    if (!allowOutside) {
      finalCenterX = Math.max(
        effWidthCm / 2,
        Math.min(activeRoom.widthCm - effWidthCm / 2, centerXCm)
      );
      finalCenterY = Math.max(
        effDepthCm / 2,
        Math.min(activeRoom.heightCm - effDepthCm / 2, centerYCm)
      );
    }

    // Update edge memory:
    //   - violated: remember this edge (so next drag past it is allowed)
    //   - not violated: table is back inside, forget any prior edge
    if (violated) {
      edgeMemoryRef.current.set(tableId, dominantEdge);
    } else {
      edgeMemoryRef.current.delete(tableId);
    }

    const newXCm = Math.round(finalCenterX - sizeWidthCm / 2);
    const newYCm = Math.round(finalCenterY - sizeDepthCm / 2);
    const nextTables = plan.tables.map((t) => {
      const raw = {
        id: t.id,
        label: t.label,
        tableSizeOptionId: t.tableSizeOptionId,
        roomId: t.roomId,
        rotationDeg: t.rotationDeg,
        x: t.x,
        y: t.y,
        assignedApplicationId: t.assignedApplicationId,
      };
      if (t.id !== tableId) return raw;
      return { ...raw, x: newXCm, y: newYCm };
    });
    onChange({ rooms: plan.rooms, tables: nextTables, labels: plan.labels });
  }

  const tablesInRoom =
    activeRoomId && plan
      ? plan.tables.filter((t) => t.roomId === activeRoomId)
      : [];
  const labelsInRoom =
    activeRoomId && plan
      ? plan.labels.filter((l) => l.roomId === activeRoomId)
      : [];

  function handleLabelDragEnd(
    labelId: string,
    stageXPx: number,
    stageYPx: number
  ) {
    if (!plan || !onChange || !activeRoom) return;
    const newX = Math.max(
      0,
      Math.min(activeRoom.widthCm, Math.round((stageXPx - PADDING_PX) / scale))
    );
    const newY = Math.max(
      0,
      Math.min(activeRoom.heightCm, Math.round((stageYPx - PADDING_PX) / scale))
    );
    onChange({
      rooms: plan.rooms,
      tables: plan.tables.map((t) => ({
        id: t.id,
        label: t.label,
        tableSizeOptionId: t.tableSizeOptionId,
        roomId: t.roomId,
        rotationDeg: t.rotationDeg,
        x: t.x,
        y: t.y,
        assignedApplicationId: t.assignedApplicationId,
      })),
      labels: plan.labels.map((l) =>
        l.id === labelId ? { ...l, x: newX, y: newY } : l
      ),
    });
  }

  const roomWidthPx = viewportCm.widthCm * scale;
  const roomHeightPx = viewportCm.heightCm * scale;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ backgroundColor: COLORS.backdrop }}
    >
      {!activeRoom ? (
        <div
          className="flex items-center justify-center p-12 text-center text-sm"
          style={{ minHeight: 360, color: COLORS.hintText }}
        >
          {(plan?.rooms.length ?? 0) === 0
            ? "Add your first room from the toolbar above."
            : "Select a room to view its layout."}
        </div>
      ) : (
        <Stage
          width={stageWidth}
          height={stageHeight}
          onMouseDown={(e) => {
            // Click on the stage background → clear selection.
            if (e.target === e.target.getStage() && onSelectTable) {
              onSelectTable(null);
            }
          }}
        >
          {/* Layer 1: room frame (shadow + fill + grid) */}
          <Layer listening={false}>
            {/* Drop shadow sits slightly below and to the right */}
            <Rect
              x={PADDING_PX + 2}
              y={PADDING_PX + 4}
              width={roomWidthPx}
              height={roomHeightPx}
              fill={COLORS.tableShadow}
              cornerRadius={10}
              opacity={0.35}
            />
            <Rect
              x={PADDING_PX}
              y={PADDING_PX}
              width={roomWidthPx}
              height={roomHeightPx}
              fill={COLORS.roomFill}
              stroke={COLORS.roomStroke}
              strokeWidth={1.5}
              cornerRadius={10}
            />
            <GridBackground
              widthCm={viewportCm.widthCm}
              heightCm={viewportCm.heightCm}
              scale={scale}
              offsetX={PADDING_PX}
              offsetY={PADDING_PX}
            />
            {/* Room label pill */}
            <Group x={PADDING_PX + 10} y={PADDING_PX + 10}>
              <Rect
                width={Math.max(120, activeRoom.name.length * 7 + 32)}
                height={22}
                fill={COLORS.roomLabelBg}
                cornerRadius={11}
              />
              <Text
                x={12}
                y={5}
                text={`${activeRoom.name}  ·  ${(activeRoom.widthCm / 100).toFixed(1)} × ${(activeRoom.heightCm / 100).toFixed(1)} m`}
                fontSize={11}
                fontStyle="600"
                fill={COLORS.roomLabelText}
              />
            </Group>
          </Layer>

          {/* Layer 2: labels (drawn beneath tables so a table on top of a
              label doesn't get obscured by annotation text) */}
          <Layer>
            {labelsInRoom.map((label) => (
              <Group
                key={label.id}
                x={PADDING_PX + label.x * scale}
                y={PADDING_PX + label.y * scale}
                rotation={label.rotationDeg}
                draggable={editable}
                onDragEnd={(e) =>
                  handleLabelDragEnd(label.id, e.target.x(), e.target.y())
                }
              >
                <Circle x={-6} y={7} radius={3} fill={COLORS.labelPin} />
                <Text
                  text={label.text}
                  fontSize={13}
                  fontStyle="600"
                  fill={COLORS.labelText}
                />
              </Group>
            ))}
          </Layer>

          {/* Layer 3: tables */}
          <Layer>
            {tablesInRoom.map((table) => {
              const size = sizeById.get(table.tableSizeOptionId);
              if (!size || !size.widthCm || !size.depthCm) return null;
              const highlight =
                highlightApplicationId &&
                table.assignment?.applicationId === highlightApplicationId;
              const selected = table.id === selectedTableId;
              const assigned = table.assignment !== null;
              const wPx = size.widthCm * scale;
              const hPx = size.depthCm * scale;
              const centerX = PADDING_PX + (table.x + size.widthCm / 2) * scale;
              const centerY = PADDING_PX + (table.y + size.depthCm / 2) * scale;
              const fill = assigned
                ? COLORS.tableAssignedFill
                : COLORS.tableUnassignedFill;
              const stroke = highlight
                ? COLORS.highlightGlow
                : assigned
                  ? COLORS.tableAssignedStroke
                  : COLORS.tableUnassignedStroke;
              return (
                <Group
                  key={table.id}
                  x={centerX}
                  y={centerY}
                  rotation={table.rotationDeg}
                  draggable={editable}
                  onMouseDown={(e) => {
                    if (onSelectTable) {
                      e.cancelBubble = true;
                      onSelectTable(table.id);
                    }
                  }}
                  onTap={() => onSelectTable?.(table.id)}
                  onDragEnd={(e) =>
                    handleTableDragEnd(
                      table.id,
                      e.target.x(),
                      e.target.y(),
                      size.widthCm!,
                      size.depthCm!,
                      table.rotationDeg
                    )
                  }
                >
                  {/* Highlight halo (rendered under the rect when viewer
                      is the assigned artist) */}
                  {highlight && (
                    <Rect
                      x={-wPx / 2 - 6}
                      y={-hPx / 2 - 6}
                      width={wPx + 12}
                      height={hPx + 12}
                      fill="rgba(139, 92, 246, 0.15)"
                      cornerRadius={8}
                    />
                  )}
                  {/* Selection ring (editor only) — dashed outline that
                      tells the user which table the arrow keys move */}
                  {selected && !highlight && (
                    <Rect
                      x={-wPx / 2 - 4}
                      y={-hPx / 2 - 4}
                      width={wPx + 8}
                      height={hPx + 8}
                      stroke="#1d4ed8"
                      strokeWidth={1.5}
                      dash={[6, 4]}
                      cornerRadius={8}
                      listening={false}
                    />
                  )}
                  {/* Shadow */}
                  <Rect
                    x={-wPx / 2 + 1}
                    y={-hPx / 2 + 3}
                    width={wPx}
                    height={hPx}
                    fill={COLORS.tableShadow}
                    cornerRadius={6}
                    opacity={0.4}
                  />
                  {/* Main body */}
                  <Rect
                    x={-wPx / 2}
                    y={-hPx / 2}
                    width={wPx}
                    height={hPx}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={highlight ? 2.5 : assigned ? 1.5 : 1}
                    cornerRadius={6}
                  />
                  {/* Accent strip along the top — signals "this end faces
                      the aisle" and adds a splash of colour */}
                  <Rect
                    x={-wPx / 2}
                    y={-hPx / 2}
                    width={wPx}
                    height={4}
                    fill={
                      assigned
                        ? COLORS.tableAssignedStroke
                        : COLORS.tableUnassignedStroke
                    }
                    cornerRadius={[6, 6, 0, 0]}
                    opacity={0.6}
                  />
                  <Text
                    x={-wPx / 2 + 8}
                    y={-hPx / 2 + 10}
                    text={table.label}
                    fontSize={12}
                    fontStyle="700"
                    fill="#0f172a"
                  />
                  <Text
                    x={-wPx / 2 + 8}
                    y={-hPx / 2 + 26}
                    text={
                      table.assignment
                        ? table.assignment.artistDisplayName
                        : "available"
                    }
                    fontSize={10}
                    fontStyle={table.assignment ? "500" : "400"}
                    fill={table.assignment ? "#1e40af" : "#64748b"}
                    width={wPx - 16}
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
  offsetX,
  offsetY,
}: {
  widthCm: number;
  heightCm: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const lines: React.ReactNode[] = [];
  for (let x = GRID_CM; x < widthCm; x += GRID_CM) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[offsetX + x * scale, offsetY, offsetX + x * scale, offsetY + heightCm * scale]}
        stroke={COLORS.gridLine}
        strokeWidth={1}
        dash={[2, 4]}
      />
    );
  }
  for (let y = GRID_CM; y < heightCm; y += GRID_CM) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[offsetX, offsetY + y * scale, offsetX + widthCm * scale, offsetY + y * scale]}
        stroke={COLORS.gridLine}
        strokeWidth={1}
        dash={[2, 4]}
      />
    );
  }
  return <>{lines}</>;
}

export default FloorPlanCanvas;
