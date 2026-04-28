"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";
import type { ResolvedFloorPlan } from "@/lib/floor-plans/queries";
import { PolygonEditorLayer } from "./polygon-editor-layer";
import { EdgeLengthPopup } from "./edge-length-popup";
import {
  type Point,
  edgeLengthCm,
  resizeEdge,
  snapToAxis,
  snapToVertex,
} from "@/lib/floor-plans/geometry";
import {
  type SnapGuide,
  type SnapTarget,
  computeTableSnap,
  guidesEqual,
} from "@/lib/floor-plans/snap";

const GRID_CM = 100;
const DEFAULT_ROOM_SIZE_CM = { widthCm: 1000, heightCm: 700 };

// Colour palette tuned against the Conaro theme. Stays muted so the
// plan reads as a drafting surface, not a painted diagram.
const COLORS = {
  backdrop: "#f6f7f9",
  roomFill: "#ffffff",
  roomStroke: "#cbd5e1",
  canvasOutline: "#94a3b8",
  gridLine: "#e6e8ec",
  gridOrigin: "#d1d5db",
  tableUnassignedFill: "#f1f5f9",
  tableUnassignedStroke: "#94a3b8",
  tableShadow: "rgba(15, 23, 42, 0.12)",
  highlightGlow: "#8b5cf6",
  labelText: "#0f172a",
  labelMuted: "#6b7280",
  labelPin: "#6366f1",
  hintText: "#64748b",
};

// Pastel container palette mirroring the design's per-artist tints.
// Each assigned table picks a deterministic colour from this list
// based on the application id, so the room reads as a varied set of
// occupied stands without needing any per-artist cover data.
const ASSIGNED_PALETTE: ReadonlyArray<{ fill: string; stroke: string }> = [
  { fill: "#ece1ff", stroke: "#6a37d4" }, // primary-container / primary
  { fill: "#ffd6e1", stroke: "#b41340" }, // tertiary-container / destructive
  { fill: "#d8f4e4", stroke: "#0a8f5a" }, // success-container / success
  { fill: "#ffe7b3", stroke: "#b06b00" }, // warning-container / warning
  { fill: "#d7e4fb", stroke: "#1960c7" }, // info-container / info
  { fill: "#e4c6ff", stroke: "#5f2d92" }, // secondary-container
];

function pickAssignedTone(applicationId: string) {
  let sum = 0;
  for (let i = 0; i < applicationId.length; i += 1) {
    sum += applicationId.charCodeAt(i);
  }
  return ASSIGNED_PALETTE[sum % ASSIGNED_PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export type FloorPlanViewMode = "design" | "populate";

interface FloorPlanCanvasProps {
  plan: ResolvedFloorPlan | null;
  activeRoomId: string | null;
  tableSizeOptions: TableSizeOption[];
  editable: boolean;
  onChange?: (next: FloorPlan) => void;
  highlightApplicationId?: string;
  /** Number that increments on each focus action. When it changes
   *  the canvas re-centres on the highlighted table at zoom 1.6×
   *  and the halo pulses for ~2 s. */
  focusToken?: number;
  /** Viewer-mode click on an assigned table — opens an info card
   *  populated from the artist's profile data. */
  onAssignedTableTap?: (applicationId: string) => void;
  /** Outlines the selected table; arrow-key nudging in the parent
   *  moves it. */
  selectedTableId?: string | null;
  onSelectTable?: (id: string | null) => void;
  /** Editor-only switch between table placement (default) and
   *  room-shape authoring. Pan/zoom is enabled in design mode so
   *  organizers can work precisely. */
  viewMode?: FloorPlanViewMode;
}

export function FloorPlanCanvas({
  plan,
  activeRoomId,
  tableSizeOptions,
  editable,
  onChange,
  highlightApplicationId,
  focusToken = 0,
  onAssignedTableTap,
  selectedTableId,
  onSelectTable,
  viewMode = "populate",
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  // In-progress polygon being drawn in design mode. Empty when not
  // drawing. When committed (close-click or 3+ verts and click on
  // first vertex), the vertices flush up via onChange and this clears.
  const [drawingVertices, setDrawingVertices] = useState<Point[]>([]);
  const [cursorCm, setCursorCm] = useState<Point | null>(null);
  // When non-null, an edge-length popup is open for the active room's
  // polygon. `anchorPx` is in the canvas container's coordinate space.
  const [edgeEdit, setEdgeEdit] = useState<{
    edgeIndex: number;
    anchorPx: { xPx: number; yPx: number };
  } | null>(null);
  // Smart-guide list active during a table drag. Cleared when no
  // guides are engaged or when drag ends. Rendered by Task 3
  // (DragSnapGuidesLayer); the value is captured here so the snap
  // math can populate it from inside dragBoundFunc.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [snapGuides, setSnapGuides] = useState<SnapGuide[] | null>(null);
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
  const aspectFitHeight = viewportCm.heightCm * scale + PADDING_PX * 2;
  // On phone-sized containers we floor the canvas at a generous
  // height so the room has real estate to breathe, the zoom toolbar
  // doesn't overlap content, and pinch-zoom has somewhere to go.
  // Desktop stays aspect-fit.
  const isMobileWidth = containerWidth > 0 && containerWidth < 640;
  const stageHeight = isMobileWidth
    ? Math.max(aspectFitHeight, 520)
    : aspectFitHeight;

  const sizeById = useMemo(
    () => new Map(tableSizeOptions.map((s) => [s.id, s])),
    [tableSizeOptions]
  );

  // Clamps a table's centre to the canvas-rect bounds. Polygon-aware
  // clamping during drag was tried earlier but its iterative settle
  // produced visible jitter on non-convex polygons — the polygon now
  // serves as a visual reference only on this surface. Arrow-key
  // nudge in the editor still uses polygon clamping where small
  // discrete deltas keep it stable.
  function clampTableCenterToRoom(
    center: Point,
    halfWidthCm: number,
    halfDepthCm: number
  ): Point {
    if (!activeRoom) return center;
    return {
      xCm: Math.max(
        halfWidthCm,
        Math.min(activeRoom.widthCm - halfWidthCm, center.xCm)
      ),
      yCm: Math.max(
        halfDepthCm,
        Math.min(activeRoom.heightCm - halfDepthCm, center.yCm)
      ),
    };
  }

  function clampLabelCenterToRoom(center: Point): Point {
    if (!activeRoom) return center;
    return {
      xCm: Math.max(0, Math.min(activeRoom.widthCm, center.xCm)),
      yCm: Math.max(0, Math.min(activeRoom.heightCm, center.yCm)),
    };
  }

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
    const clamped = clampTableCenterToRoom(
      { xCm: centerXCm, yCm: centerYCm },
      effWidthCm,
      effDepthCm
    );
    const newXCm = Math.round(clamped.xCm - sizeWidthCm / 2);
    const newYCm = Math.round(clamped.yCm - sizeDepthCm / 2);
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
    const clamped = clampLabelCenterToRoom({
      xCm: (stageXPx - PADDING_PX) / scale,
      yCm: (stageYPx - PADDING_PX) / scale,
    });
    const newX = Math.round(clamped.xCm);
    const newY = Math.round(clamped.yCm);
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

  function handlePolygonChange(nextVertices: Point[]) {
    if (!plan || !onChange || !activeRoom) return;
    onChange({
      rooms: plan.rooms.map((r) =>
        r.id === activeRoom.id ? { ...r, vertices: nextVertices } : r
      ),
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
      labels: plan.labels,
    });
  }

  function handlePolygonEdgeClick(
    edgeIndex: number,
    midpointStagePx: { xPx: number; yPx: number }
  ) {
    // Stage coords already account for pan/zoom — they're effectively
    // canvas-container coordinates from the user's perspective.
    setEdgeEdit({ edgeIndex, anchorPx: midpointStagePx });
  }

  function handleEdgeLengthSubmit(newLengthM: number) {
    if (!edgeEdit || !plan || !onChange || !activeRoom?.vertices) {
      setEdgeEdit(null);
      return;
    }
    const next = resizeEdge(
      activeRoom.vertices,
      edgeEdit.edgeIndex,
      newLengthM * 100
    ).map((v) => ({ xCm: Math.round(v.xCm), yCm: Math.round(v.yCm) }));
    onChange({
      rooms: plan.rooms.map((r) =>
        r.id === activeRoom.id ? { ...r, vertices: next } : r
      ),
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
      labels: plan.labels,
    });
    setEdgeEdit(null);
  }

  // Drawing mode is automatic: we're in design view on a room without
  // a saved polygon. Stage clicks place vertices; click on the first
  // vertex (3+ placed) closes; Esc cancels; Backspace pops the last.
  const drawingMode =
    editable && viewMode === "design" && !activeRoom?.vertices;
  const VERTEX_SNAP_PX = 10;
  const AXIS_SNAP_DEG = 5;

  // Convert a Stage pointer position (already in stage coordinates,
  // accounting for pan/zoom) into room-local centimetres. Returns null
  // if the cursor is outside the canvas's positive area.
  function stagePointToCm(stageX: number, stageY: number): Point | null {
    const xCm = (stageX - PADDING_PX) / scale;
    const yCm = (stageY - PADDING_PX) / scale;
    if (!Number.isFinite(xCm) || !Number.isFinite(yCm)) return null;
    return { xCm: Math.round(xCm), yCm: Math.round(yCm) };
  }

  // Apply snap rules to a candidate cm position during drawing. Vertex
  // snap (to any already-placed vertex) wins; otherwise lock to the
  // axis through the previous vertex when within tolerance.
  function snapDuringDrawing(candidate: Point): Point {
    const snapThresholdCm = VERTEX_SNAP_PX / scale;
    const vertexHit = snapToVertex(
      candidate,
      drawingVertices,
      snapThresholdCm
    );
    if (vertexHit) return vertexHit;
    if (drawingVertices.length === 0) return candidate;
    const prev = drawingVertices[drawingVertices.length - 1];
    return snapToAxis(prev, candidate, AXIS_SNAP_DEG);
  }

  function handleStageMouseMove(e: KonvaEventObject<MouseEvent>) {
    if (!drawingMode) return;
    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;
    const raw = stagePointToCm(pos.x, pos.y);
    if (!raw) return;
    setCursorCm(snapDuringDrawing(raw));
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!drawingMode) return;
    // Clicks on draggable children (vertex circles, etc.) bubble up
    // here too — ignore if the target isn't the stage itself.
    if (e.target !== e.target.getStage()) return;
    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;
    const raw = stagePointToCm(pos.x, pos.y);
    if (!raw) return;

    // Closing the polygon: cursor near the first placed vertex with
    // 3+ vertices already.
    if (drawingVertices.length >= 3) {
      const first = drawingVertices[0];
      const firstPx = {
        x: PADDING_PX + first.xCm * scale,
        y: PADDING_PX + first.yCm * scale,
      };
      const dx = firstPx.x - pos.x;
      const dy = firstPx.y - pos.y;
      if (Math.hypot(dx, dy) <= VERTEX_SNAP_PX) {
        if (plan && onChange && activeRoom) {
          onChange({
            rooms: plan.rooms.map((r) =>
              r.id === activeRoom.id
                ? { ...r, vertices: drawingVertices }
                : r
            ),
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
            labels: plan.labels,
          });
        }
        setDrawingVertices([]);
        setCursorCm(null);
        return;
      }
    }

    const snapped = snapDuringDrawing(raw);
    setDrawingVertices((prev) => [...prev, snapped]);
  }

  // Esc cancels in-progress draw; Backspace pops the last vertex.
  // Skip when focus is inside an input so typed text isn't intercepted.
  useEffect(() => {
    if (!drawingMode) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") {
        if (drawingVertices.length > 0) {
          e.preventDefault();
          setDrawingVertices([]);
        }
      } else if (e.key === "Backspace") {
        if (drawingVertices.length > 0) {
          e.preventDefault();
          setDrawingVertices((prev) => prev.slice(0, -1));
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawingMode, drawingVertices.length]);

  // Reset drawing state when the active room changes or the user
  // leaves design mode mid-draw.
  useEffect(() => {
    setDrawingVertices([]);
    setCursorCm(null);
  }, [activeRoomId, viewMode]);

  const roomWidthPx = viewportCm.widthCm * scale;
  const roomHeightPx = viewportCm.heightCm * scale;

  // Pan/zoom is enabled in viewer mode and in editor's design mode.
  // In populate mode the user drags tables directly; layering Stage
  // drag on top would steal those events.
  const panZoomEnabled = !editable || viewMode === "design";
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

  // Auto-focus on the highlighted table when the focus token bumps
  // (URL ?focus=table on first paint, or the parent's search triggers
  // a re-focus). Centres the table at scale 1.6 so the artist sees
  // their stand without hunting through the room.
  useEffect(() => {
    if (!panZoomEnabled || !focusToken || !highlightApplicationId) return;
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
    // the focus token bumps or the highlight target changes, not on
    // every container resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panZoomEnabled, focusToken, highlightApplicationId]);

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
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseMove={handleStageMouseMove}
          >
          {/* Layer 1: room frame (shadow + fill + grid) */}
          <Layer listening={false}>
            {/* Drop shadow sits slightly below and to the right.
                For polygons we still use the canvas-rect shadow — the
                slight halo around concave corners is a feature, not a
                bug; the actual room outline is drawn on top. */}
            <Rect
              x={PADDING_PX + 2}
              y={PADDING_PX + 4}
              width={roomWidthPx}
              height={roomHeightPx}
              fill={COLORS.tableShadow}
              cornerRadius={10}
              opacity={0.35}
            />
            {activeRoom?.vertices && activeRoom.vertices.length >= 3 ? (
              <Line
                points={activeRoom.vertices.flatMap((v) => [
                  PADDING_PX + v.xCm * scale,
                  PADDING_PX + v.yCm * scale,
                ])}
                closed
                fill={COLORS.roomFill}
                stroke={COLORS.roomStroke}
                strokeWidth={1.5}
              />
            ) : (
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
            )}
            {/* In design mode, always show a faint dashed canvas-rect
                so organizers know the room's declared scale. When no
                polygon is drawn this is the only outline; when a
                polygon exists it serves as a scale reference. */}
            {editable && viewMode === "design" && (
              <Rect
                x={PADDING_PX}
                y={PADDING_PX}
                width={roomWidthPx}
                height={roomHeightPx}
                stroke={COLORS.canvasOutline}
                strokeWidth={1}
                dash={[4, 4]}
                opacity={0.55}
              />
            )}
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
              const tone = table.assignment
                ? pickAssignedTone(table.assignment.applicationId)
                : null;
              const fill = tone ? tone.fill : COLORS.tableUnassignedFill;
              const stroke = highlight
                ? COLORS.highlightGlow
                : tone
                  ? tone.stroke
                  : COLORS.tableUnassignedStroke;
              const initials = table.assignment
                ? initialsFor(table.assignment.artistDisplayName)
                : "";
              // Initials font scales loosely with the smaller side
              // so they read at any room/zoom — clamped between
              // 11 and 18 px.
              const initialsFontPx = Math.round(
                Math.max(11, Math.min(18, Math.min(wPx, hPx) / 2.6))
              );
              return (
                <Group
                  key={table.id}
                  x={centerX}
                  y={centerY}
                  rotation={table.rotationDeg}
                  draggable={editable && viewMode === "populate"}
                  dragBoundFunc={(pos) => {
                    const proposed: Point = {
                      xCm: (pos.x - PADDING_PX) / scale,
                      yCm: (pos.y - PADDING_PX) / scale,
                    };
                    const halfWCm = effWidthPx / 2 / scale;
                    const halfDCm = effDepthPx / 2 / scale;

                    // Build snap targets from siblings in this room.
                    const others: SnapTarget[] = [];
                    for (const sibling of tablesInRoom) {
                      if (sibling.id === table.id) continue;
                      const siblingSize = sizeById.get(
                        sibling.tableSizeOptionId
                      );
                      if (
                        !siblingSize?.widthCm ||
                        !siblingSize?.depthCm
                      ) {
                        continue;
                      }
                      const siblingRotated =
                        sibling.rotationDeg === 90 ||
                        sibling.rotationDeg === 270;
                      const sibEffW = siblingRotated
                        ? siblingSize.depthCm
                        : siblingSize.widthCm;
                      const sibEffD = siblingRotated
                        ? siblingSize.widthCm
                        : siblingSize.depthCm;
                      const sibCenterX =
                        sibling.x + siblingSize.widthCm / 2;
                      const sibCenterY =
                        sibling.y + siblingSize.depthCm / 2;
                      others.push({
                        leftCm: sibCenterX - sibEffW / 2,
                        rightCm: sibCenterX + sibEffW / 2,
                        topCm: sibCenterY - sibEffD / 2,
                        bottomCm: sibCenterY + sibEffD / 2,
                        centerXCm: sibCenterX,
                        centerYCm: sibCenterY,
                      });
                    }

                    const snap = computeTableSnap({
                      proposedCenter: proposed,
                      halfWidthCm: halfWCm,
                      halfDepthCm: halfDCm,
                      others,
                      canvas: {
                        widthCm: activeRoom.widthCm,
                        heightCm: activeRoom.heightCm,
                      },
                      thresholdCm: 6 / scale,
                    });

                    // Update guides only when they actually changed —
                    // dragBoundFunc fires per mousemove, so the
                    // short-circuit keeps re-renders bounded.
                    setSnapGuides((prev) =>
                      guidesEqual(prev, snap.guides) ? prev : snap.guides
                    );

                    // Canvas-rect clamp wins (REQ-9): post-snap
                    // position can't escape the canvas bounds.
                    return {
                      x: Math.max(
                        minCx,
                        Math.min(
                          maxCx,
                          PADDING_PX + snap.adjustedCenter.xCm * scale
                        )
                      ),
                      y: Math.max(
                        minCy,
                        Math.min(
                          maxCy,
                          PADDING_PX + snap.adjustedCenter.yCm * scale
                        )
                      ),
                    };
                  }}
                  onMouseDown={(e) => {
                    if (onSelectTable) {
                      e.cancelBubble = true;
                      onSelectTable(table.id);
                    }
                  }}
                  onTap={() => onSelectTable?.(table.id)}
                  onClick={(e) => {
                    if (
                      !editable &&
                      onAssignedTableTap &&
                      table.assignment
                    ) {
                      e.cancelBubble = true;
                      onAssignedTableTap(table.assignment.applicationId);
                    }
                  }}
                  onDragEnd={(e) => {
                    handleTableDragEnd(
                      table.id,
                      e.target.x(),
                      e.target.y(),
                      size.widthCm!,
                      size.depthCm!,
                      table.rotationDeg
                    );
                    setSnapGuides(null);
                  }}
                >
                  {/* Highlight halo (rendered under the rect when viewer
                      is the assigned artist). focusToken-keyed so it
                      remounts when the parent bumps a re-focus, which
                      re-runs the pulse animation cleanly. */}
                  {highlight && (
                    <HighlightHalo
                      key={`halo-${focusToken}`}
                      wPx={wPx}
                      hPx={hPx}
                      pulse={focusToken > 0}
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
                  {/* Main body — soft-pastel container per assigned
                      artist, muted grey when unassigned. No accent
                      strip; the design keeps each stand a single
                      clean rect. */}
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
                  {/* Stand ID — small mono label top-left. */}
                  <Text
                    x={-wPx / 2 + 6}
                    y={-hPx / 2 + 5}
                    text={table.label}
                    fontSize={9}
                    fontStyle="700"
                    fontFamily="JetBrains Mono, ui-monospace, monospace"
                    fill={COLORS.labelMuted}
                    listening={false}
                  />
                  {/* Big artist initials, centred — replaces the
                      previous wordy artist-name footer. Computed once
                      via initialsFor(). */}
                  {initials && (
                    <Text
                      x={-wPx / 2}
                      y={-initialsFontPx / 2}
                      width={wPx}
                      align="center"
                      text={initials}
                      fontSize={initialsFontPx}
                      fontStyle="800"
                      fontFamily="Manrope, ui-sans-serif, system-ui, sans-serif"
                      fill={COLORS.labelText}
                      listening={false}
                    />
                  )}
                </Group>
              );
            })}
          </Layer>
          {editable && viewMode === "design" && activeRoom && (
            <PolygonEditorLayer
              vertices={activeRoom.vertices ?? null}
              inProgressVertices={drawingVertices}
              cursorCm={cursorCm}
              paddingPx={PADDING_PX}
              scale={scale}
              vertexSnapPx={VERTEX_SNAP_PX}
              onVerticesChange={handlePolygonChange}
              onEdgeClick={handlePolygonEdgeClick}
            />
          )}
        </Stage>
        {edgeEdit && activeRoom?.vertices && (
          <EdgeLengthPopup
            key={`${activeRoom.id}-${edgeEdit.edgeIndex}`}
            open
            currentLengthM={
              edgeLengthCm(activeRoom.vertices, edgeEdit.edgeIndex) / 100
            }
            anchorPx={edgeEdit.anchorPx}
            onSubmit={handleEdgeLengthSubmit}
            onCancel={() => setEdgeEdit(null)}
          />
        )}
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
