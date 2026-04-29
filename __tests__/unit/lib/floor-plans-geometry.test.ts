import { describe, it, expect } from "vitest";
import {
  type Point,
  snapToAxis,
  snapToVertex,
  resizeEdge,
  edgeLengthCm,
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
