"use client";

import { Layer, Line } from "react-konva";

import type { SnapGuide } from "@/lib/floor-plans/snap";

interface DragSnapGuidesLayerProps {
  guides: SnapGuide[];
  paddingPx: number;
  scale: number;
}

const GUIDE_COLOR = "#6a37d4";
const GUIDE_OPACITY = 0.85;
const GUIDE_DASH = [4, 4];

// Renders the Figma-style smart guides while a table drag is engaged.
// Each guide line spans the perpendicular extent that covers both
// the dragged table and the snap target. listening={false} so the
// layer never interferes with drag/click handlers above.
export function DragSnapGuidesLayer({
  guides,
  paddingPx,
  scale,
}: DragSnapGuidesLayerProps) {
  if (guides.length === 0) return null;
  return (
    <Layer listening={false}>
      {guides.map((g, i) => {
        const fromPx = paddingPx + g.spanFromCm * scale;
        const toPx = paddingPx + g.spanToCm * scale;
        if (g.axis === "x") {
          // Vertical line at constant x.
          const x = paddingPx + g.positionCm * scale;
          return (
            <Line
              key={`guide-${i}`}
              points={[x, fromPx, x, toPx]}
              stroke={GUIDE_COLOR}
              strokeWidth={1}
              opacity={GUIDE_OPACITY}
              dash={GUIDE_DASH}
            />
          );
        }
        // Horizontal line at constant y.
        const y = paddingPx + g.positionCm * scale;
        return (
          <Line
            key={`guide-${i}`}
            points={[fromPx, y, toPx, y]}
            stroke={GUIDE_COLOR}
            strokeWidth={1}
            opacity={GUIDE_OPACITY}
            dash={GUIDE_DASH}
          />
        );
      })}
    </Layer>
  );
}
