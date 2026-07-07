import { describe, expect, it } from "vitest";
import type { FloorPlan } from "@/lib/db/schema/events";
import { unassignApplicationFromPlan } from "@/lib/floor-plans/assignments";

function makePlan(assignments: (string | null)[]): FloorPlan {
  return {
    rooms: [{ id: "r1", name: "Main", x: 0, y: 0, widthCm: 100, heightCm: 100 }],
    tables: assignments.map((assignedApplicationId, i) => ({
      id: `t${i}`,
      label: `T${i}`,
      tableSizeOptionId: "s1",
      roomId: "r1",
      rotationDeg: 0,
      x: 0,
      y: 0,
      assignedApplicationId,
    })),
    labels: [],
  };
}

describe("unassignApplicationFromPlan", () => {
  it("nulls the table assigned to the application and reports changed", () => {
    const plan = makePlan(["app-1", "app-2", null]);
    const { plan: next, changed } = unassignApplicationFromPlan(plan, "app-1");

    expect(changed).toBe(true);
    expect(next.tables[0].assignedApplicationId).toBeNull();
    expect(next.tables[1].assignedApplicationId).toBe("app-2");
    expect(next.tables[2].assignedApplicationId).toBeNull();
  });

  it("reports no change and returns the same plan when unassigned", () => {
    const plan = makePlan(["app-2", null]);
    const { plan: next, changed } = unassignApplicationFromPlan(plan, "app-1");

    expect(changed).toBe(false);
    expect(next).toBe(plan);
  });

  it("clears every table an application occupies", () => {
    const plan = makePlan(["app-1", "app-1"]);
    const { plan: next, changed } = unassignApplicationFromPlan(plan, "app-1");

    expect(changed).toBe(true);
    expect(next.tables.every((t) => t.assignedApplicationId === null)).toBe(
      true
    );
  });
});
