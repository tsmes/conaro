// Pure snap math for the floor planner's table drag interaction.
// Given a proposed table centre, neighbouring tables, and a canvas
// extent, computes the closest aligned position per axis (within a
// threshold) and the visual guides that should accompany the snap.

import type { Point } from "@/lib/floor-plans/geometry";

// Axis-aligned bounding box of a snap source — typically a table or
// the canvas. All values are room-local cm.
export interface SnapTarget {
  leftCm: number;
  rightCm: number;
  topCm: number;
  bottomCm: number;
  centerXCm: number;
  centerYCm: number;
}

// A single engaged guide. `axis` indicates the line's orientation:
// "x" = vertical line (constant xCm), "y" = horizontal line.
// `spanFromCm`/`spanToCm` are along the perpendicular axis so the
// guide line covers both the dragged table and the target.
export interface SnapGuide {
  axis: "x" | "y";
  positionCm: number;
  spanFromCm: number;
  spanToCm: number;
}

export interface ComputeTableSnapArgs {
  proposedCenter: Point;
  halfWidthCm: number;
  halfDepthCm: number;
  /** Sibling snap sources in the active room (typically rotated table
   *  bounding boxes). Excludes the dragged table itself. */
  others: SnapTarget[];
  /** Canvas extent — the canvas contributes its 4 edges and centres. */
  canvas: { widthCm: number; heightCm: number };
  /** Snap threshold in cm (caller converts from screen pixels). */
  thresholdCm: number;
}

export interface ComputeTableSnapResult {
  adjustedCenter: Point;
  guides: SnapGuide[];
}

// Builds a SnapTarget for the canvas itself.
function canvasTarget(widthCm: number, heightCm: number): SnapTarget {
  return {
    leftCm: 0,
    rightCm: widthCm,
    topCm: 0,
    bottomCm: heightCm,
    centerXCm: widthCm / 2,
    centerYCm: heightCm / 2,
  };
}

// Builds a SnapTarget for the dragged table at the given centre.
function targetForRectAt(
  center: Point,
  halfWidthCm: number,
  halfDepthCm: number
): SnapTarget {
  return {
    leftCm: center.xCm - halfWidthCm,
    rightCm: center.xCm + halfWidthCm,
    topCm: center.yCm - halfDepthCm,
    bottomCm: center.yCm + halfDepthCm,
    centerXCm: center.xCm,
    centerYCm: center.yCm,
  };
}

// Line description used while collecting candidates.
interface AxisLine {
  position: number; // along the snap axis
  perpFrom: number; // span along the perpendicular axis
  perpTo: number;
}

function dragLinesX(t: SnapTarget): AxisLine[] {
  return [
    { position: t.leftCm, perpFrom: t.topCm, perpTo: t.bottomCm },
    { position: t.rightCm, perpFrom: t.topCm, perpTo: t.bottomCm },
    { position: t.centerXCm, perpFrom: t.topCm, perpTo: t.bottomCm },
  ];
}

function dragLinesY(t: SnapTarget): AxisLine[] {
  return [
    { position: t.topCm, perpFrom: t.leftCm, perpTo: t.rightCm },
    { position: t.bottomCm, perpFrom: t.leftCm, perpTo: t.rightCm },
    { position: t.centerYCm, perpFrom: t.leftCm, perpTo: t.rightCm },
  ];
}

interface BestSnap {
  delta: number; // adjustment to apply to centre on this axis
  guide: SnapGuide;
}

// Finds the axis snap with the smallest |distance|. The dragged
// table's three lines (left/right/centre on x; top/bottom/centre on
// y) each consider every target line; the minimum-distance pair
// within `thresholdCm` wins. Returns null if nothing is in range.
function bestAxisSnap(
  axis: "x" | "y",
  draggedLines: AxisLine[],
  targetLines: AxisLine[],
  thresholdCm: number
): BestSnap | null {
  let best: BestSnap | null = null;
  for (const dragged of draggedLines) {
    for (const target of targetLines) {
      const distance = target.position - dragged.position;
      if (Math.abs(distance) > thresholdCm) continue;
      const span = unionSpan(dragged, target);
      const candidate: BestSnap = {
        delta: distance,
        guide: {
          axis,
          positionCm: target.position,
          spanFromCm: span.from,
          spanToCm: span.to,
        },
      };
      if (!best || Math.abs(candidate.delta) < Math.abs(best.delta)) {
        best = candidate;
      }
    }
  }
  return best;
}

function unionSpan(
  a: AxisLine,
  b: AxisLine
): { from: number; to: number } {
  return {
    from: Math.min(a.perpFrom, b.perpFrom),
    to: Math.max(a.perpTo, b.perpTo),
  };
}

export function computeTableSnap(
  args: ComputeTableSnapArgs
): ComputeTableSnapResult {
  const {
    proposedCenter,
    halfWidthCm,
    halfDepthCm,
    others,
    canvas,
    thresholdCm,
  } = args;

  if (thresholdCm <= 0) {
    return { adjustedCenter: proposedCenter, guides: [] };
  }

  const dragged = targetForRectAt(proposedCenter, halfWidthCm, halfDepthCm);
  const allTargets: SnapTarget[] = [
    ...others,
    canvasTarget(canvas.widthCm, canvas.heightCm),
  ];

  const targetLinesX = allTargets.flatMap(dragLinesX);
  const targetLinesY = allTargets.flatMap(dragLinesY);

  const snapX = bestAxisSnap(
    "x",
    dragLinesX(dragged),
    targetLinesX,
    thresholdCm
  );
  const snapY = bestAxisSnap(
    "y",
    dragLinesY(dragged),
    targetLinesY,
    thresholdCm
  );

  const adjustedCenter: Point = {
    xCm: proposedCenter.xCm + (snapX?.delta ?? 0),
    yCm: proposedCenter.yCm + (snapY?.delta ?? 0),
  };

  const guides: SnapGuide[] = [];
  if (snapX) guides.push(snapX.guide);
  if (snapY) guides.push(snapY.guide);

  return { adjustedCenter, guides };
}

// Convenience: compares two guide arrays for value-equality, used by
// the canvas to short-circuit setState when nothing changed between
// drag ticks.
export function guidesEqual(
  a: SnapGuide[] | null,
  b: SnapGuide[] | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const ga = a[i];
    const gb = b[i];
    if (
      ga.axis !== gb.axis ||
      ga.positionCm !== gb.positionCm ||
      ga.spanFromCm !== gb.spanFromCm ||
      ga.spanToCm !== gb.spanToCm
    ) {
      return false;
    }
  }
  return true;
}
