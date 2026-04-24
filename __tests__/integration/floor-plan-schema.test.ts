import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
} from "../helpers/db";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FloorPlan } from "@/lib/db/schema/events";

describe("events.floor_plan JSONB column", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("defaults to null for newly created events", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan).toBeNull();
  });

  it("round-trips a populated plan", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);

    const plan: FloorPlan = {
      rooms: [
        {
          id: "r-1",
          name: "Main hall",
          x: 0,
          y: 0,
          widthCm: 850,
          heightCm: 500,
        },
      ],
      tables: [
        {
          id: "t-1",
          label: "T1",
          tableSizeOptionId: "ts-standard",
          x: 50,
          y: 50,
          assignedApplicationId: null,
        },
        {
          id: "t-2",
          label: "T2",
          tableSizeOptionId: "ts-standard",
          x: 200,
          y: 50,
          assignedApplicationId: "app-123",
        },
      ],
    };

    await db
      .update(events)
      .set({ floorPlan: plan })
      .where(eq(events.id, event.id));

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));

    expect(row.floorPlan).toEqual(plan);
  });

  it("survives clearing to null again", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);

    await db
      .update(events)
      .set({
        floorPlan: {
          rooms: [
            {
              id: "r-1",
              name: "X",
              x: 0,
              y: 0,
              widthCm: 100,
              heightCm: 100,
            },
          ],
          tables: [],
        },
      })
      .where(eq(events.id, event.id));

    await db
      .update(events)
      .set({ floorPlan: null })
      .where(eq(events.id, event.id));

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan).toBeNull();
  });
});
