import { describe, it, expect } from "vitest";
import {
  type SnapGuide,
  type SnapTarget,
  computeTableSnap,
  guidesEqual,
} from "@/lib/floor-plans/snap";

const tableTarget = (
  centerXCm: number,
  centerYCm: number,
  widthCm = 120,
  depthCm = 80
): SnapTarget => ({
  leftCm: centerXCm - widthCm / 2,
  rightCm: centerXCm + widthCm / 2,
  topCm: centerYCm - depthCm / 2,
  bottomCm: centerYCm + depthCm / 2,
  centerXCm,
  centerYCm,
});

describe("computeTableSnap", () => {
  const baseCanvas = { widthCm: 1000, heightCm: 800 };
  const halfWidthCm = 60;
  const halfDepthCm = 40;

  it("returns the proposed centre unchanged when no target is in range", () => {
    // Position chosen to be off every canvas reference and far from
    // the lone neighbour at (100, 100).
    const result = computeTableSnap({
      proposedCenter: { xCm: 510, yCm: 305 },
      halfWidthCm,
      halfDepthCm,
      others: [tableTarget(100, 100)],
      canvas: baseCanvas,
      thresholdCm: 5,
    });
    expect(result.adjustedCenter).toEqual({ xCm: 510, yCm: 305 });
    expect(result.guides).toEqual([]);
  });

  it("snaps the dragged table's left edge to a neighbour's left edge within threshold", () => {
    // Neighbour at center (300, 200), so left edge = 240.
    // Dragged proposed centre at (303, 600) → its left edge is 243.
    // Distance = 240 - 243 = -3 → within threshold.
    const result = computeTableSnap({
      proposedCenter: { xCm: 303, yCm: 600 },
      halfWidthCm,
      halfDepthCm,
      others: [tableTarget(300, 200)],
      canvas: baseCanvas,
      thresholdCm: 10,
    });
    expect(result.adjustedCenter.xCm).toBe(300);
    expect(result.adjustedCenter.yCm).toBe(600);
    const xGuide = result.guides.find((g) => g.axis === "x");
    expect(xGuide?.positionCm).toBe(240);
  });

  it("snaps independently on x and y to two different neighbours", () => {
    // Different sizes from the dragged so edge→edge fallbacks are out
    // of range and only centre→centre snaps fire.
    const left = tableTarget(200, 400, 200, 100); // x edges 100/300
    const above = tableTarget(700, 100, 200, 100); // y edges 50/150
    const result = computeTableSnap({
      proposedCenter: { xCm: 202, yCm: 98 },
      halfWidthCm,
      halfDepthCm,
      others: [left, above],
      canvas: baseCanvas,
      thresholdCm: 5,
    });
    expect(result.adjustedCenter).toEqual({ xCm: 200, yCm: 100 });
    expect(result.guides).toHaveLength(2);
    const xGuide = result.guides.find((g) => g.axis === "x");
    const yGuide = result.guides.find((g) => g.axis === "y");
    expect(xGuide?.positionCm).toBe(200);
    expect(yGuide?.positionCm).toBe(100);
  });

  it("snaps to canvas centre on both axes when proposed centre is near the middle", () => {
    const result = computeTableSnap({
      proposedCenter: { xCm: 502, yCm: 398 },
      halfWidthCm,
      halfDepthCm,
      others: [],
      canvas: baseCanvas,
      thresholdCm: 6,
    });
    expect(result.adjustedCenter).toEqual({ xCm: 500, yCm: 400 });
    expect(result.guides.map((g) => g.axis).sort()).toEqual(["x", "y"]);
  });

  it("picks the closer of two competing targets on the same axis", () => {
    // Two neighbours both within range of the dragged left edge.
    // Far one at center-x=120 (left edge 60) — distance 6 from
    // dragged left edge 66.
    // Near one at center-x=130 (left edge 70) — distance 4.
    const result = computeTableSnap({
      proposedCenter: { xCm: 126, yCm: 500 },
      halfWidthCm,
      halfDepthCm,
      others: [tableTarget(120, 500), tableTarget(130, 500)],
      canvas: baseCanvas,
      thresholdCm: 10,
    });
    const xGuide = result.guides.find((g) => g.axis === "x");
    expect(xGuide?.positionCm).toBe(70); // the closer target's left edge
  });

  it("snaps right-edge-of-dragged to left-edge-of-target", () => {
    // Neighbour to the right whose left edge is at 360.
    // Dragged proposed centre 297 → right edge 357. Distance 3.
    const result = computeTableSnap({
      proposedCenter: { xCm: 297, yCm: 400 },
      halfWidthCm,
      halfDepthCm,
      others: [tableTarget(420, 400)], // left edge = 360
      canvas: baseCanvas,
      thresholdCm: 5,
    });
    expect(result.adjustedCenter.xCm).toBe(300);
    const xGuide = result.guides.find((g) => g.axis === "x");
    expect(xGuide?.positionCm).toBe(360);
  });

  it("returns no guides and no adjustment when threshold is zero", () => {
    const result = computeTableSnap({
      proposedCenter: { xCm: 500, yCm: 400 },
      halfWidthCm,
      halfDepthCm,
      others: [tableTarget(500, 400)],
      canvas: baseCanvas,
      thresholdCm: 0,
    });
    expect(result.adjustedCenter).toEqual({ xCm: 500, yCm: 400 });
    expect(result.guides).toEqual([]);
  });

  it("emits a guide that spans both the dragged table and the target", () => {
    const neighbour = tableTarget(300, 200, 100, 60);
    // Snap dragged's left edge (66) to neighbour's left edge (250).
    // Both lines are vertical (axis "x"); the guide should span the
    // perpendicular (y) extent covering both rectangles' top/bottom.
    const result = computeTableSnap({
      proposedCenter: { xCm: 312, yCm: 600 },
      halfWidthCm,
      halfDepthCm,
      others: [neighbour],
      canvas: baseCanvas,
      thresholdCm: 12,
    });
    const xGuide = result.guides.find((g) => g.axis === "x");
    expect(xGuide).toBeDefined();
    // Dragged y-extent: 560..640. Neighbour y-extent: 170..230.
    // Span union: 170..640.
    expect(xGuide?.spanFromCm).toBe(170);
    expect(xGuide?.spanToCm).toBe(640);
  });
});

describe("guidesEqual", () => {
  const guide = (
    axis: "x" | "y",
    positionCm: number,
    spanFromCm = 0,
    spanToCm = 100
  ): SnapGuide => ({ axis, positionCm, spanFromCm, spanToCm });

  it("returns true for identical references", () => {
    const a = [guide("x", 100)];
    expect(guidesEqual(a, a)).toBe(true);
  });

  it("returns true for two equal arrays", () => {
    expect(guidesEqual([guide("x", 100)], [guide("x", 100)])).toBe(true);
  });

  it("returns false when lengths differ", () => {
    expect(
      guidesEqual([guide("x", 100)], [guide("x", 100), guide("y", 200)])
    ).toBe(false);
  });

  it("returns false when any field differs", () => {
    expect(guidesEqual([guide("x", 100)], [guide("x", 101)])).toBe(false);
  });

  it("treats null pairs as equal", () => {
    expect(guidesEqual(null, null)).toBe(true);
  });

  it("treats null vs array as not equal", () => {
    expect(guidesEqual(null, [guide("x", 100)])).toBe(false);
  });
});
