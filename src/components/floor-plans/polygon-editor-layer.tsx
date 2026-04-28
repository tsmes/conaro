"use client";

import { Layer, Line, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

import type { Point } from "@/lib/floor-plans/geometry";

interface PolygonEditorLayerProps {
  /** Active room polygon in cm (room-local). `null` = no polygon yet. */
  vertices: Point[] | null;
  /** Pixel padding the canvas leaves around the room. */
  paddingPx: number;
  /** cm → px scale derived by the canvas. */
  scale: number;
  /** Called with a fresh polygon when a vertex finishes dragging. */
  onVerticesChange: (next: Point[]) => void;
  /** Called when an edge is clicked. `midpointScreenPx` is in the
   *  canvas-container's coordinate space (matches stage coords). */
  onEdgeClick: (
    edgeIndex: number,
    midpointScreenPx: { xPx: number; yPx: number }
  ) => void;
}

const COLORS = {
  edge: "#6a37d4",
  edgeHit: "transparent",
  vertexFill: "#ffffff",
  vertexStroke: "#6a37d4",
};

const VERTEX_RADIUS_PX = 6;
const EDGE_HIT_WIDTH_PX = 14;

export function PolygonEditorLayer({
  vertices,
  paddingPx,
  scale,
  onVerticesChange,
  onEdgeClick,
}: PolygonEditorLayerProps) {
  if (!vertices || vertices.length < 3) return null;

  const cmToPx = (v: Point) => ({
    x: paddingPx + v.xCm * scale,
    y: paddingPx + v.yCm * scale,
  });

  const handleEdgeClick = (edgeIndex: number) => {
    const a = cmToPx(vertices[edgeIndex]);
    const b = cmToPx(vertices[(edgeIndex + 1) % vertices.length]);
    onEdgeClick(edgeIndex, {
      xPx: (a.x + b.x) / 2,
      yPx: (a.y + b.y) / 2,
    });
  };

  const handleVertexDragEnd = (
    index: number,
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const xCm = Math.round((node.x() - paddingPx) / scale);
    const yCm = Math.round((node.y() - paddingPx) / scale);
    const next = vertices.slice();
    next[index] = { xCm, yCm };
    onVerticesChange(next);
  };

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
            onClick={() => handleEdgeClick(i)}
            onTap={() => handleEdgeClick(i)}
            // The visible outline is rendered by the canvas's layer-1
            // polygon line; this layer only carries the hit area + a
            // subtle stroke when hovered.
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
            onMouseDown={(e) => {
              // Prevent stage drag-pan from stealing the gesture.
              e.cancelBubble = true;
            }}
            onTouchStart={(e) => {
              e.cancelBubble = true;
            }}
            onDragEnd={(e) => handleVertexDragEnd(i, e)}
          />
        );
      })}
    </Layer>
  );
}
