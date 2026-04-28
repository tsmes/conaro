"use client";

import { Layer, Line, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

import type { Point } from "@/lib/floor-plans/geometry";

interface PolygonEditorLayerProps {
  /** Active room polygon in cm (room-local). `null` = no polygon yet. */
  vertices: Point[] | null;
  /** Vertices currently being placed during a drawing session. Ignored
   *  when `vertices` is non-null (only one mode at a time). */
  inProgressVertices: Point[];
  /** Latest cursor position in cm — drives the rubber-band line. `null`
   *  means the cursor is outside the canvas. */
  cursorCm: Point | null;
  /** Pixel padding the canvas leaves around the room. */
  paddingPx: number;
  /** cm → px scale derived by the canvas. */
  scale: number;
  /** Vertex-snap threshold in screen pixels — also used to decide when
   *  hovering near the first in-progress vertex highlights it for
   *  closing the polygon. */
  vertexSnapPx: number;
  /** Called with a fresh polygon when a vertex finishes dragging. */
  onVerticesChange: (next: Point[]) => void;
  /** Called when an edge is clicked. `midpointScreenPx` is in the
   *  Stage's coordinate space. */
  onEdgeClick: (
    edgeIndex: number,
    midpointScreenPx: { xPx: number; yPx: number }
  ) => void;
}

const COLORS = {
  edge: "#6a37d4",
  vertexFill: "#ffffff",
  vertexStroke: "#6a37d4",
  drawingLine: "#6a37d4",
  drawingVertex: "#6a37d4",
  rubberBand: "#94a3b8",
  closeHaloFill: "#ffd6e1",
  closeHaloStroke: "#b41340",
};

const VERTEX_RADIUS_PX = 6;
const FIRST_VERTEX_HALO_RADIUS_PX = 10;
const EDGE_HIT_WIDTH_PX = 14;

export function PolygonEditorLayer({
  vertices,
  inProgressVertices,
  cursorCm,
  paddingPx,
  scale,
  vertexSnapPx,
  onVerticesChange,
  onEdgeClick,
}: PolygonEditorLayerProps) {
  const cmToPx = (v: Point) => ({
    x: paddingPx + v.xCm * scale,
    y: paddingPx + v.yCm * scale,
  });

  // Mode 1: a committed polygon exists — render draggable vertices and
  // clickable edges.
  if (vertices && vertices.length >= 3) {
    return (
      <Layer>
        {vertices.map((_, i) => {
          const a = cmToPx(vertices[i]);
          const b = cmToPx(vertices[(i + 1) % vertices.length]);
          return (
            <Line
              key={`edge-${i}`}
              points={[a.x, a.y, b.x, b.y]}
              stroke={COLORS.edge}
              strokeWidth={EDGE_HIT_WIDTH_PX}
              opacity={0}
              hitStrokeWidth={EDGE_HIT_WIDTH_PX}
              onClick={() => {
                onEdgeClick(i, {
                  xPx: (a.x + b.x) / 2,
                  yPx: (a.y + b.y) / 2,
                });
              }}
              onTap={() => {
                onEdgeClick(i, {
                  xPx: (a.x + b.x) / 2,
                  yPx: (a.y + b.y) / 2,
                });
              }}
            />
          );
        })}
        {vertices.map((v, i) => {
          const p = cmToPx(v);
          return (
            <Circle
              key={`vertex-${i}`}
              x={p.x}
              y={p.y}
              radius={VERTEX_RADIUS_PX}
              fill={COLORS.vertexFill}
              stroke={COLORS.vertexStroke}
              strokeWidth={2}
              draggable
              onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true;
              }}
              onTouchStart={(e: KonvaEventObject<TouchEvent>) => {
                e.cancelBubble = true;
              }}
              onDragEnd={(e: KonvaEventObject<DragEvent>) => {
                const node = e.target;
                const xCm = Math.round((node.x() - paddingPx) / scale);
                const yCm = Math.round((node.y() - paddingPx) / scale);
                const next = vertices.slice();
                next[i] = { xCm, yCm };
                onVerticesChange(next);
              }}
            />
          );
        })}
      </Layer>
    );
  }

  // Mode 2: drawing in progress — render placed vertices, lines
  // between them, and a rubber-band line to the cursor.
  if (inProgressVertices.length === 0) return null;

  const placedPx = inProgressVertices.map(cmToPx);
  const cursorPx = cursorCm ? cmToPx(cursorCm) : null;

  // Linear path through placed vertices.
  const linePoints = placedPx.flatMap((p) => [p.x, p.y]);

  // Rubber-band line from last placed vertex to cursor.
  const last = placedPx[placedPx.length - 1];

  // Highlight the first vertex when:
  //  - we have 3+ placed (so closing produces a valid polygon)
  //  - the cursor is within the snap threshold of vertex 0
  let canClose = false;
  if (cursorPx && placedPx.length >= 3) {
    const first = placedPx[0];
    const dx = first.x - cursorPx.x;
    const dy = first.y - cursorPx.y;
    if (Math.hypot(dx, dy) <= vertexSnapPx) canClose = true;
  }

  return (
    <Layer listening={false}>
      {linePoints.length >= 4 && (
        <Line
          points={linePoints}
          stroke={COLORS.drawingLine}
          strokeWidth={2}
        />
      )}
      {cursorPx && last && (
        <Line
          points={[last.x, last.y, cursorPx.x, cursorPx.y]}
          stroke={COLORS.rubberBand}
          strokeWidth={1.5}
          dash={[4, 4]}
        />
      )}
      {canClose && (
        <Circle
          x={placedPx[0].x}
          y={placedPx[0].y}
          radius={FIRST_VERTEX_HALO_RADIUS_PX}
          fill={COLORS.closeHaloFill}
          stroke={COLORS.closeHaloStroke}
          strokeWidth={2}
        />
      )}
      {placedPx.map((p, i) => (
        <Circle
          key={`progress-${i}`}
          x={p.x}
          y={p.y}
          radius={VERTEX_RADIUS_PX - 1}
          fill={COLORS.drawingVertex}
        />
      ))}
    </Layer>
  );
}
