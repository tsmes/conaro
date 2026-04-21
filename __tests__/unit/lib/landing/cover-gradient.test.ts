import { describe, it, expect } from "vitest";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";

describe("pickCoverGradient", () => {
  it("is deterministic — same input returns the same class across calls", () => {
    const a = pickCoverGradient("convention-abc-123");
    const b = pickCoverGradient("convention-abc-123");
    expect(a).toBe(b);
  });

  it("returns a valid cover-* class", () => {
    const valid = new Set([
      "cover-a",
      "cover-b",
      "cover-c",
      "cover-d",
      "cover-e",
      "cover-f",
    ]);
    expect(valid.has(pickCoverGradient("some-id"))).toBe(true);
  });

  it("distributes different ids across multiple gradients", () => {
    const results = new Set([
      pickCoverGradient("kawaiicon"),
      pickCoverGradient("polycon"),
      pickCoverGradient("minizine-fair"),
      pickCoverGradient("draw-day-nordic"),
      pickCoverGradient("inkfest"),
      pickCoverGradient("summer-temp-con"),
    ]);
    expect(results.size).toBeGreaterThan(1);
  });

  it("handles empty string without throwing", () => {
    expect(() => pickCoverGradient("")).not.toThrow();
  });
});
