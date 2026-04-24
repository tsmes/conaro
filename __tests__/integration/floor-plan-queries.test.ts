import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  createTestArtist,
  createTestApplication,
} from "../helpers/db";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import type { FloorPlan } from "@/lib/db/schema/events";
import { getFloorPlanForEvent } from "@/lib/floor-plans/queries";

describe("getFloorPlanForEvent", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("returns null when the event has no plan", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    expect(await getFloorPlanForEvent(event.id)).toBeNull();
  });

  it("returns the plan with assignment: null when no tables have assignees", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const plan: FloorPlan = {
      rooms: [
        {
          id: "r-1",
          name: "Hall",
          x: 0,
          y: 0,
          widthCm: 500,
          heightCm: 400,
        },
      ],
      tables: [
        {
          id: "t-1",
          label: "T1",
          tableSizeOptionId: "ts-std",
          roomId: "r-1",
          rotationDeg: 0,
          x:100,
          y: 100,
          assignedApplicationId: null,
        },
      ],
    };
    await db
      .update(events)
      .set({ floorPlan: plan })
      .where(eq(events.id, event.id));

    const resolved = await getFloorPlanForEvent(event.id);
    expect(resolved).not.toBeNull();
    expect(resolved!.tables[0].assignment).toBeNull();
  });

  it("resolves displayName + requestedTableSizeOptionId for assigned accepted artists", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await createTestArtist("elena@test.com", "Elena");
    const app = await createTestApplication(event.id, artist.profile.id);
    await db
      .update(applications)
      .set({
        status: "accepted",
        answers: { tableSizeOptionId: "ts-large" },
      })
      .where(eq(applications.id, app.id));

    const plan: FloorPlan = {
      rooms: [
        {
          id: "r-1",
          name: "Hall",
          x: 0,
          y: 0,
          widthCm: 500,
          heightCm: 400,
        },
      ],
      tables: [
        {
          id: "t-1",
          label: "T1",
          tableSizeOptionId: "ts-std",
          roomId: "r-1",
          rotationDeg: 0,
          x:0,
          y: 0,
          assignedApplicationId: app.id,
        },
      ],
    };
    await db
      .update(events)
      .set({ floorPlan: plan })
      .where(eq(events.id, event.id));

    const resolved = await getFloorPlanForEvent(event.id);
    expect(resolved!.tables[0].assignment).toEqual({
      applicationId: app.id,
      artistDisplayName: "Elena",
      requestedTableSizeOptionId: "ts-large",
    });
  });

  it("drops assignments to cross-event applications (defensive)", async () => {
    const { convention } = await createTestOrganizer();
    const eventA = await createTestEvent(convention.id);
    const eventB = await createTestEvent(convention.id);
    const artist = await createTestArtist("elena@test.com", "Elena");
    // Application belongs to eventB.
    const app = await createTestApplication(eventB.id, artist.profile.id);
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, app.id));

    // Plan on eventA points at eventB's application id.
    await db
      .update(events)
      .set({
        floorPlan: {
          rooms: [
            {
              id: "r-1",
              name: "Hall",
              x: 0,
              y: 0,
              widthCm: 500,
              heightCm: 400,
            },
          ],
          tables: [
            {
              id: "t-1",
              label: "T1",
              tableSizeOptionId: "ts-std",
              roomId: "r-1",
              rotationDeg: 0,
              x:0,
              y: 0,
              assignedApplicationId: app.id,
            },
          ],
        },
      })
      .where(eq(events.id, eventA.id));

    const resolved = await getFloorPlanForEvent(eventA.id);
    expect(resolved!.tables[0].assignment).toBeNull();
  });

  it("drops assignments to non-accepted applications", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await createTestArtist("elena@test.com", "Elena");
    const app = await createTestApplication(event.id, artist.profile.id);
    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.id, app.id));

    await db
      .update(events)
      .set({
        floorPlan: {
          rooms: [
            {
              id: "r-1",
              name: "Hall",
              x: 0,
              y: 0,
              widthCm: 500,
              heightCm: 400,
            },
          ],
          tables: [
            {
              id: "t-1",
              label: "T1",
              tableSizeOptionId: "ts-std",
              roomId: "r-1",
              rotationDeg: 0,
              x:0,
              y: 0,
              assignedApplicationId: app.id,
            },
          ],
        },
      })
      .where(eq(events.id, event.id));

    const resolved = await getFloorPlanForEvent(event.id);
    expect(resolved!.tables[0].assignment).toBeNull();
  });
});
