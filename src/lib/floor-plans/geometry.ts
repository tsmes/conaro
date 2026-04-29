// Pure geometry utilities for the polygon-room floor planner.
// All coordinates are in centimetres in the room-local coordinate system
// (canvas top-left = (0, 0)).

export interface Point {
  xCm: number;
  yCm: number;
}

// Locks a candidate vertex to the horizontal/vertical axis through
// `prev` when the angle from `prev → candidate` is within
// `toleranceDeg` of 0°/90°/180°/270°. The locked axis takes priority
// when both are within tolerance (corner case: candidate ≈ prev).
export function snapToAxis(
  prev: Point,
  candidate: Point,
  toleranceDeg = 5
): Point {
  const dx = candidate.xCm - prev.xCm;
  const dy = candidate.yCm - prev.yCm;
  if (dx === 0 && dy === 0) return candidate;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Reduce to [-90, 90] so 0/180 collapse, 90/-90 collapse.
  const horizontalDelta = Math.min(
    Math.abs(angleDeg),
    Math.abs(180 - Math.abs(angleDeg))
  );
  const verticalDelta = Math.abs(Math.abs(angleDeg) - 90);
  if (horizontalDelta <= verticalDelta && horizontalDelta <= toleranceDeg) {
    return { xCm: candidate.xCm, yCm: prev.yCm };
  }
  if (verticalDelta < horizontalDelta && verticalDelta <= toleranceDeg) {
    return { xCm: prev.xCm, yCm: candidate.yCm };
  }
  return candidate;
}

// Returns the closest existing vertex within `thresholdCm` of
// `candidate`, or `null` if no vertex is within range. Caller decides
// whether to use the snap target or the original candidate.
export function snapToVertex(
  candidate: Point,
  vertices: Point[],
  thresholdCm: number
): Point | null {
  let best: Point | null = null;
  let bestDistSq = thresholdCm * thresholdCm;
  for (const v of vertices) {
    const dx = v.xCm - candidate.xCm;
    const dy = v.yCm - candidate.yCm;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      best = v;
      bestDistSq = distSq;
    }
  }
  return best;
}

// Resizes the edge `[edgeIndex, edgeIndex + 1]` of `polygon` so that
// its length becomes `newLengthCm`. The edge keeps its current
// direction; `polygon[edgeIndex]` is the anchor (stays put) and the
// other endpoint slides along the existing direction. Returns a fresh
// polygon array; the input is not mutated. The last edge wraps around
// to vertex 0. Zero-length input edges return the polygon unchanged
// (no direction to preserve).
export function resizeEdge(
  polygon: Point[],
  edgeIndex: number,
  newLengthCm: number
): Point[] {
  if (edgeIndex < 0 || edgeIndex >= polygon.length) return polygon;
  if (!Number.isFinite(newLengthCm) || newLengthCm <= 0) return polygon;
  const start = polygon[edgeIndex];
  const endIdx = (edgeIndex + 1) % polygon.length;
  const end = polygon[endIdx];
  const dx = end.xCm - start.xCm;
  const dy = end.yCm - start.yCm;
  const currentLength = Math.hypot(dx, dy);
  if (currentLength === 0) return polygon;
  const ux = dx / currentLength;
  const uy = dy / currentLength;
  const next = polygon.slice();
  next[endIdx] = {
    xCm: start.xCm + ux * newLengthCm,
    yCm: start.yCm + uy * newLengthCm,
  };
  return next;
}

// Returns the length in cm of the edge from polygon[i] to polygon[i+1]
// (last edge wraps to vertex 0).
export function edgeLengthCm(polygon: Point[], edgeIndex: number): number {
  if (edgeIndex < 0 || edgeIndex >= polygon.length) return 0;
  const a = polygon[edgeIndex];
  const b = polygon[(edgeIndex + 1) % polygon.length];
  return Math.hypot(b.xCm - a.xCm, b.yCm - a.yCm);
}
