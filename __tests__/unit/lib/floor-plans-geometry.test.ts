import { describe, it, expect } from "vitest";
import {
  type Point,
  snapToAxis,
  snapToVertex,
  resizeEdge,
  edgeLengthCm,
  rotatedAabbExtents,
  isOrthogonalRotation,
  snapAngleTo15,
} from "@/lib/floor-plans/geometry";

const rect = (w: number, h: number): Point[] => [
  { xCm: 0, yCm: 0 },
  { xCm: w, yCm: 0 },
  { xCm: w, yCm: h },
  { xCm: 0, yCm: h },
];

describe("snapToAxis", () => {
  const prev: Point = { xCm: 100, yCm: 100 };

  it("locks to horizontal when within tolerance", () => {
    const snapped = snapToAxis(prev, { xCm: 200, yCm: 102 });
    expect(snapped).toEqual({ xCm: 200, yCm: 100 });
  });

  it("locks to vertical when within tolerance", () => {
    const snapped = snapToAxis(prev, { xCm: 102, yCm: 200 });
    expect(snapped).toEqual({ xCm: 100, yCm: 200 });
  });

  it("leaves diagonal candidates unchanged", () => {
    const snapped = snapToAxis(prev, { xCm: 200, yCm: 200 });
    expect(snapped).toEqual({ xCm: 200, yCm: 200 });
  });

  it("returns candidate unchanged when prev equals candidate", () => {
    const snapped = snapToAxis(prev, prev);
    expect(snapped).toEqual(prev);
  });
});

describe("snapToVertex", () => {
  const verts: Point[] = [
    { xCm: 0, yCm: 0 },
    { xCm: 100, yCm: 0 },
    { xCm: 100, yCm: 100 },
  ];

  it("returns the closest vertex when within threshold", () => {
    expect(snapToVertex({ xCm: 5, yCm: 5 }, verts, 20)).toEqual({
      xCm: 0,
      yCm: 0,
    });
  });

  it("returns null when no vertex is within threshold", () => {
    expect(snapToVertex({ xCm: 50, yCm: 50 }, verts, 10)).toBeNull();
  });

  it("returns the matching vertex (not a copy)", () => {
    const target = verts[1];
    expect(snapToVertex({ xCm: 99, yCm: 1 }, verts, 5)).toBe(target);
  });
});

describe("resizeEdge", () => {
  it("shrinks an axis-aligned edge from its anchor", () => {
    const polygon = rect(400, 200);
    const next = resizeEdge(polygon, 0, 200);
    expect(next[0]).toEqual({ xCm: 0, yCm: 0 });
    expect(next[1]).toEqual({ xCm: 200, yCm: 0 });
  });

  it("grows an axis-aligned edge along the same direction", () => {
    const polygon = rect(400, 200);
    const next = resizeEdge(polygon, 0, 700);
    expect(next[1]).toEqual({ xCm: 700, yCm: 0 });
  });

  it("preserves the direction of a diagonal edge", () => {
    const polygon: Point[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 300, yCm: 400 }, // length 500
      { xCm: 0, yCm: 400 },
    ];
    const next = resizeEdge(polygon, 0, 1000);
    expect(next[1].xCm).toBeCloseTo(600);
    expect(next[1].yCm).toBeCloseTo(800);
  });

  it("wraps when resizing the last edge", () => {
    const polygon = rect(400, 200);
    const next = resizeEdge(polygon, 3, 100);
    expect(next[3]).toEqual({ xCm: 0, yCm: 200 });
    expect(next[0].xCm).toBe(0);
    expect(next[0].yCm).toBeCloseTo(100);
  });

  it("returns the input unchanged for non-positive lengths", () => {
    const polygon = rect(400, 200);
    expect(resizeEdge(polygon, 0, 0)).toBe(polygon);
    expect(resizeEdge(polygon, 0, -50)).toBe(polygon);
  });

  it("does not mutate the input polygon", () => {
    const polygon = rect(400, 200);
    const before = JSON.stringify(polygon);
    resizeEdge(polygon, 0, 250);
    expect(JSON.stringify(polygon)).toBe(before);
  });
});

describe("edgeLengthCm", () => {
  it("computes axis-aligned edge length", () => {
    expect(edgeLengthCm(rect(400, 200), 0)).toBe(400);
    expect(edgeLengthCm(rect(400, 200), 1)).toBe(200);
  });

  it("computes diagonal edge length", () => {
    const polygon: Point[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 300, yCm: 400 },
      { xCm: 0, yCm: 400 },
    ];
    expect(edgeLengthCm(polygon, 0)).toBe(500);
  });

  it("wraps for the last edge", () => {
    const polygon = rect(400, 200);
    expect(edgeLengthCm(polygon, 3)).toBe(200);
  });
});

describe("rotatedAabbExtents", () => {
  it("returns half-width/half-depth for an unrotated rectangle", () => {
    const { halfWidthCm, halfDepthCm } = rotatedAabbExtents(200, 100, 0);
    expect(halfWidthCm).toBeCloseTo(100);
    expect(halfDepthCm).toBeCloseTo(50);
  });

  it("swaps width/depth at 90°", () => {
    const { halfWidthCm, halfDepthCm } = rotatedAabbExtents(200, 100, 90);
    expect(halfWidthCm).toBeCloseTo(50);
    expect(halfDepthCm).toBeCloseTo(100);
  });

  it("computes the diagonal AABB at 45°", () => {
    const { halfWidthCm, halfDepthCm } = rotatedAabbExtents(200, 100, 45);
    // (200 + 100) * cos(45°) / 2 = 150 / √2
    const expected = 150 / Math.SQRT2;
    expect(halfWidthCm).toBeCloseTo(expected);
    expect(halfDepthCm).toBeCloseTo(expected);
  });

  it("handles negative rotations (mirror of positive)", () => {
    const positive = rotatedAabbExtents(200, 100, 30);
    const negative = rotatedAabbExtents(200, 100, -30);
    expect(positive.halfWidthCm).toBeCloseTo(negative.halfWidthCm);
    expect(positive.halfDepthCm).toBeCloseTo(negative.halfDepthCm);
  });
});

describe("isOrthogonalRotation", () => {
  it("returns true for cardinal angles", () => {
    expect(isOrthogonalRotation(0)).toBe(true);
    expect(isOrthogonalRotation(90)).toBe(true);
    expect(isOrthogonalRotation(180)).toBe(true);
    expect(isOrthogonalRotation(270)).toBe(true);
    expect(isOrthogonalRotation(360)).toBe(true);
    expect(isOrthogonalRotation(-90)).toBe(true);
  });

  it("returns false for non-orthogonal angles", () => {
    expect(isOrthogonalRotation(45)).toBe(false);
    expect(isOrthogonalRotation(89)).toBe(false);
    expect(isOrthogonalRotation(91)).toBe(false);
    expect(isOrthogonalRotation(100)).toBe(false);
  });

  it("honours the epsilon", () => {
    expect(isOrthogonalRotation(89.995)).toBe(true);
    expect(isOrthogonalRotation(89.5, 0.01)).toBe(false);
    expect(isOrthogonalRotation(89.5, 1)).toBe(true);
  });

  it("rejects non-finite numbers", () => {
    expect(isOrthogonalRotation(Number.NaN)).toBe(false);
    expect(isOrthogonalRotation(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("snapAngleTo15", () => {
  it("snaps to the nearest 15° step", () => {
    expect(snapAngleTo15(7)).toBe(0);
    expect(snapAngleTo15(8)).toBe(15);
    expect(snapAngleTo15(17)).toBe(15);
    expect(snapAngleTo15(22)).toBe(15);
    expect(snapAngleTo15(23)).toBe(30);
  });

  it("normalises into [0, 360)", () => {
    expect(snapAngleTo15(360)).toBe(0);
    // -10 snaps to the nearest 15° step (-15), normalised to 345.
    expect(snapAngleTo15(-10)).toBe(345);
    expect(snapAngleTo15(359)).toBe(0);
  });

  it("respects a custom step size", () => {
    expect(snapAngleTo15(13, 5)).toBe(15);
    expect(snapAngleTo15(13, 30)).toBe(0);
  });
});
