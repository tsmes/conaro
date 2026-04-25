"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Maximize2, Minus, Plus } from "lucide-react";
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
  /** When true, the highlighted table's halo briefly pulses on
   *  mount before settling back to the static highlight. */
  pulseHighlight?: boolean;
  /** Outlines the selected table; arrow-key nudging in the parent
   *  moves it. */
  selectedTableId?: string | null;
  onSelectTable?: (id: string | null) => void;
}

export function FloorPlanCanvas({
  plan,
  activeRoomId,
  tableSizeOptions,
  editable,
  onChange,
  highlightApplicationId,
  pulseHighlight = false,
  selectedTableId,
  onSelectTable,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  // View transform applied to the Stage. The base Stage already
  // fits the room to the container width; this transform sits on
  // top so viewers can pinch/wheel-zoom and drag-pan. Editor mode
  // keeps the transform at identity so stage drag doesn't fight
  // table drag.
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const lastPinchDistRef = useRef(0);
  // Stage container needs its own touch-action: none so the browser
  // doesn't grab pinch / pan gestures.
  const stageContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    el.style.touchAction = "none";
  }, []);

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
    const clampedCenterX = Math.max(
      effWidthCm / 2,
      Math.min(activeRoom.widthCm - effWidthCm / 2, centerXCm)
    );
    const clampedCenterY = Math.max(
      effDepthCm / 2,
      Math.min(activeRoom.heightCm - effDepthCm / 2, centerYCm)
    );
    const newXCm = Math.round(clampedCenterX - sizeWidthCm / 2);
    const newYCm = Math.round(clampedCenterY - sizeDepthCm / 2);
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

  // Pan/zoom is viewer-only. In editor mode the user drags tables
  // directly; layering Stage drag on top would steal those events.
  const panZoomEnabled = !editable;
  const SCALE_MIN = 0.4;
  const SCALE_MAX = 4;

  const clampScale = useCallback(
    (s: number) => Math.max(SCALE_MIN, Math.min(SCALE_MAX, s)),
    []
  );

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      if (!panZoomEnabled) return;
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      setView((v) => {
        const oldScale = v.scale;
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const factor = 1.12;
        const newScale = clampScale(
          direction > 0 ? oldScale * factor : oldScale / factor
        );
        const ratio = newScale / oldScale;
        return {
          scale: newScale,
          x: pointer.x - (pointer.x - v.x) * ratio,
          y: pointer.y - (pointer.y - v.y) * ratio,
        };
      });
    },
    [panZoomEnabled, clampScale]
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      if (!panZoomEnabled) return;
      const touches = e.evt.touches;
      if (touches.length !== 2) return;
      e.evt.preventDefault();
      const t1 = touches[0];
      const t2 = touches[1];
      const dist = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
      );
      if (lastPinchDistRef.current === 0) {
        lastPinchDistRef.current = dist;
        return;
      }
      const stage = e.target.getStage();
      const rect = stage?.container().getBoundingClientRect();
      if (!rect) return;
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
      const factor = dist / lastPinchDistRef.current;
      lastPinchDistRef.current = dist;
      setView((v) => {
        const newScale = clampScale(v.scale * factor);
        const ratio = newScale / v.scale;
        return {
          scale: newScale,
          x: midX - (midX - v.x) * ratio,
          y: midY - (midY - v.y) * ratio,
        };
      });
    },
    [panZoomEnabled, clampScale]
  );

  const handleTouchEnd = useCallback(() => {
    lastPinchDistRef.current = 0;
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setView((v) => {
        const newScale = clampScale(v.scale * factor);
        if (newScale === v.scale) return v;
        const cx = stageWidth / 2;
        const cy = stageHeight / 2;
        const ratio = newScale / v.scale;
        return {
          scale: newScale,
          x: cx - (cx - v.x) * ratio,
          y: cy - (cy - v.y) * ratio,
        };
      });
    },
    [clampScale, stageWidth, stageHeight]
  );

  const resetView = useCallback(() => {
    setView({ scale: 1, x: 0, y: 0 });
    lastPinchDistRef.current = 0;
  }, []);

  // Auto-focus on the highlighted table when "Show me my table" is
  // active. Centres the table at scale 1.6 so the artist sees their
  // stand without hunting through the room.
  useEffect(() => {
    if (!panZoomEnabled || !pulseHighlight || !highlightApplicationId) return;
    const target = tablesInRoom.find(
      (t) => t.assignment?.applicationId === highlightApplicationId
    );
    if (!target) return;
    const size = sizeById.get(target.tableSizeOptionId);
    if (!size?.widthCm || !size?.depthCm) return;
    const cx = PADDING_PX + (target.x + size.widthCm / 2) * scale;
    const cy = PADDING_PX + (target.y + size.depthCm / 2) * scale;
    const targetScale = 1.6;
    setView({
      scale: targetScale,
      x: stageWidth / 2 - cx * targetScale,
      y: stageHeight / 2 - cy * targetScale,
    });
    // Scale + sizeById intentionally not in deps — we re-run when
    // the trigger flips or the highlight target changes, not on
    // every container resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panZoomEnabled, pulseHighlight, highlightApplicationId]);

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
        <div ref={stageContainerRef} className="relative">
          {panZoomEnabled && (
            <ZoomToolbar
              scale={view.scale}
              onZoomIn={() => zoomBy(1.25)}
              onZoomOut={() => zoomBy(1 / 1.25)}
              onReset={resetView}
            />
          )}
          <Stage
            width={stageWidth}
            height={stageHeight}
            scaleX={panZoomEnabled ? view.scale : 1}
            scaleY={panZoomEnabled ? view.scale : 1}
            x={panZoomEnabled ? view.x : 0}
            y={panZoomEnabled ? view.y : 0}
            draggable={panZoomEnabled}
            onWheel={handleWheel}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDragEnd={
              panZoomEnabled
                ? (e) => {
                    if (e.target.getStage() !== e.target) return;
                    setView((v) => ({
                      ...v,
                      x: e.target.x(),
                      y: e.target.y(),
                    }));
                  }
                : undefined
            }
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
              const rotated =
                table.rotationDeg === 90 || table.rotationDeg === 270;
              const effWidthPx = (rotated ? size.depthCm : size.widthCm) * scale;
              const effDepthPx = (rotated ? size.widthCm : size.depthCm) * scale;
              const minCx = PADDING_PX + effWidthPx / 2;
              const maxCx = PADDING_PX + activeRoom.widthCm * scale - effWidthPx / 2;
              const minCy = PADDING_PX + effDepthPx / 2;
              const maxCy = PADDING_PX + activeRoom.heightCm * scale - effDepthPx / 2;
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
                  dragBoundFunc={(pos) => ({
                    x: Math.max(minCx, Math.min(maxCx, pos.x)),
                    y: Math.max(minCy, Math.min(maxCy, pos.y)),
                  })}
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
                    <HighlightHalo
                      wPx={wPx}
                      hPx={hPx}
                      pulse={pulseHighlight}
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
                    strokeWidth={highlight ? 4 : assigned ? 1.5 : 1}
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
        </div>
      )}
    </div>
  );
}

interface ZoomToolbarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

function ZoomToolbar({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomToolbarProps) {
  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-[10px] border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="grid size-9 place-items-center rounded-[7px] text-foreground transition hover:bg-muted active:scale-95"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-12 text-center font-mono text-[11px] text-muted-foreground">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="grid size-9 place-items-center rounded-[7px] text-foreground transition hover:bg-muted active:scale-95"
      >
        <Plus className="size-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset view"
        className="grid size-9 place-items-center rounded-[7px] text-foreground transition hover:bg-muted active:scale-95"
      >
        <Maximize2 className="size-4" />
      </button>
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

// Soft purple halo behind the artist's own table. When `pulse` is
// true (driven by `?focus=table` on the floor-plan tab), runs a
// short attention-grabbing tween before settling at the static
// post-pulse opacity. Otherwise renders the static highlight.
const STATIC_HALO_OPACITY = 0.35;
const PULSE_PEAK_OPACITY = 0.85;
const PULSE_DURATION_MS = 2000;

function HighlightHalo({
  wPx,
  hPx,
  pulse,
}: {
  wPx: number;
  hPx: number;
  pulse: boolean;
}) {
  const ref = useRef<Konva.Rect | null>(null);

  useEffect(() => {
    if (!pulse) return;
    const node = ref.current;
    const layer = node?.getLayer() ?? null;
    if (!node || !layer) return;
    const startedAt = Date.now();
    // Closed-form opacity over time — two full sin cycles over 2 s,
    // then snap back to the static highlight. A single Konva.Animation
    // owns the whole pulse, so cancellation (unmount, prop flip,
    // route change) is one stop() call. No chained callbacks → no
    // race where a queued onFinish fires on a destroyed node.
    const anim = new Konva.Animation(() => {
      if (!node.getStage()) {
        anim.stop();
        return;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed >= PULSE_DURATION_MS) {
        node.opacity(STATIC_HALO_OPACITY);
        anim.stop();
        return;
      }
      const phase = (elapsed / PULSE_DURATION_MS) * Math.PI * 4;
      const t = (Math.sin(phase) + 1) / 2;
      node.opacity(
        STATIC_HALO_OPACITY + t * (PULSE_PEAK_OPACITY - STATIC_HALO_OPACITY)
      );
    }, layer);
    anim.start();
    return () => {
      anim.stop();
      if (node.getStage()) node.opacity(STATIC_HALO_OPACITY);
    };
  }, [pulse]);

  return (
    <Rect
      ref={ref}
      x={-wPx / 2 - 8}
      y={-hPx / 2 - 8}
      width={wPx + 16}
      height={hPx + 16}
      fill="rgba(139, 92, 246, 0.35)"
      cornerRadius={10}
    />
  );
}

export default FloorPlanCanvas;
