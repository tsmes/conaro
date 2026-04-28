// Pure geometry utilities for the polygon-room floor planner.
// All coordinates are in centimetres in the room-local coordinate system
// (canvas top-left = (0, 0)).

export interface Point {
  xCm: number;
  yCm: number;
}

// Returns true when `point` is strictly inside `polygon` using a
// ray-cast from the test point along the +x direction. Half-open edge
// inclusion (top edge in / bottom edge out) avoids double-counting at
// shared vertices. Polygons may be convex or concave; a polygon with
// fewer than 3 vertices contains nothing.
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.yCm > point.yCm !== b.yCm > point.yCm &&
      point.xCm <
        ((b.xCm - a.xCm) * (point.yCm - a.yCm)) / (b.yCm - a.yCm) + a.xCm;
    if (intersects) inside = !inside;
  }
  return inside;
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

// Clamps `point` to lie inside `polygon`. Points already inside pass
// through unchanged. Points outside are projected onto the nearest
// point on the polygon's perimeter. A polygon with fewer than 3
// vertices is treated as no-clamp (returns the point unchanged) —
// callers are expected to fall back to canvas-rect clamping in that
// case.
export function clampToPolygon(point: Point, polygon: Point[]): Point {
  if (polygon.length < 3) return point;
  if (pointInPolygon(point, polygon)) return point;
  let bestX = point.xCm;
  let bestY = point.yCm;
  let bestDistSq = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const projected = projectOntoSegment(point, a, b);
    const dx = projected.xCm - point.xCm;
    const dy = projected.yCm - point.yCm;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestX = projected.xCm;
      bestY = projected.yCm;
    }
  }
  return { xCm: bestX, yCm: bestY };
}

function projectOntoSegment(p: Point, a: Point, b: Point): Point {
  const abx = b.xCm - a.xCm;
  const aby = b.yCm - a.yCm;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return a;
  const t = Math.max(
    0,
    Math.min(1, ((p.xCm - a.xCm) * abx + (p.yCm - a.yCm) * aby) / lenSq)
  );
  return { xCm: a.xCm + t * abx, yCm: a.yCm + t * aby };
}

// Returns the polygon's bounding box in cm. Useful for centering /
// auto-fitting viewport calculations.
export function polygonBoundingBox(
  polygon: Point[]
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (polygon.length === 0) return null;
  let minX = polygon[0].xCm;
  let minY = polygon[0].yCm;
  let maxX = minX;
  let maxY = minY;
  for (const v of polygon) {
    if (v.xCm < minX) minX = v.xCm;
    if (v.yCm < minY) minY = v.yCm;
    if (v.xCm > maxX) maxX = v.xCm;
    if (v.yCm > maxY) maxY = v.yCm;
  }
  return { minX, minY, maxX, maxY };
}

// Returns the length in cm of the edge from polygon[i] to polygon[i+1]
// (last edge wraps to vertex 0).
export function edgeLengthCm(polygon: Point[], edgeIndex: number): number {
  if (edgeIndex < 0 || edgeIndex >= polygon.length) return 0;
  const a = polygon[edgeIndex];
  const b = polygon[(edgeIndex + 1) % polygon.length];
  return Math.hypot(b.xCm - a.xCm, b.yCm - a.yCm);
}
