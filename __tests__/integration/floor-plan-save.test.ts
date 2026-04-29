import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  createTestArtist,
  createTestApplication,
  buildFormData,
} from "../helpers/db";
import { saveFloorPlan } from "@/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan-actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import type { TableSizeOption } from "@/lib/db/schema/events";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const sizeWithDims: TableSizeOption = {
  id: "ts-std",
  label: "Standard",
  priceNok: 1200,
  widthCm: 120,
  depthCm: 80,
};

const sizeMissingDims: TableSizeOption = {
  id: "ts-nodims",
  label: "No dims",
  priceNok: null,
};

function submit(input: {
  eventId: string;
  plan: unknown;
}): ReturnType<typeof saveFloorPlan> {
  return saveFloorPlan(
    {},
    buildFormData({
      eventId: input.eventId,
      floorPlan: JSON.stringify(input.plan),
    })
  );
}

describe("saveFloorPlan", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("saves a valid plan", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
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
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 0,
            x:100,
            y: 100,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan?.rooms).toHaveLength(1);
    expect(row.floorPlan?.tables[0].label).toBe("T1");
  });

  it("rejects an unknown tableSizeOptionId", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Main",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
          },
        ],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-ghost",
            roomId: "r-1",
            rotationDeg: 0,
            x:0,
            y: 0,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.error).toContain("unknown size");
  });

  it("rejects a table whose size has no width/depth set", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeMissingDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Main",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
          },
        ],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-nodims",
            roomId: "r-1",
            rotationDeg: 0,
            x:0,
            y: 0,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.error).toContain("no width/depth");
  });

  it("rejects an assignment to a non-accepted artist", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    const artist = await createTestArtist("e@test.com", "E");
    const app = await createTestApplication(event.id, artist.profile.id);
    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.id, app.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Main",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
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
    });
    expect(result.error).toContain("not accepted");
  });

  it("rejects an assignment to a cross-event application", async () => {
    const { profile, convention } = await createTestOrganizer();
    const eventA = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    const eventB = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    const artist = await createTestArtist("e@test.com", "E");
    const app = await createTestApplication(eventB.id, artist.profile.id);
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, app.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: eventA.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Main",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
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
    });
    expect(result.error).toContain("not accepted");
  });

  it("rejects two tables sharing an assignedApplicationId", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    const artist = await createTestArtist("e@test.com", "E");
    const app = await createTestApplication(event.id, artist.profile.id);
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, app.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Main",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
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
          {
            id: "t-2",
            label: "T2",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 0,
            x:200,
            y: 0,
            assignedApplicationId: app.id,
          },
        ],
      },
    });
    expect(result.error).toContain("more than one table");
  });

  it("rejects a table whose roomId does not match any room", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Main",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
          },
        ],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-ghost",
            rotationDeg: 0,
            x: 0,
            y: 0,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.error).toContain("not assigned to a room");
  });

  it("rejects a non-owner organizer", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    const other = await createTestOrganizer(
      "other@test.com",
      "Other con"
    );
    mockAuth.mockResolvedValue({
      user: { id: "o2", role: "organizer", profileId: other.profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: { rooms: [], tables: [] },
    });
    expect(result.error).toBe("Event not found");
  });

  it("rejects non-organizer roles", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: "pid" },
    });
    const result = await submit({
      eventId: event.id,
      plan: { rooms: [], tables: [] },
    });
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects malformed JSON payload", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });
    const result = await saveFloorPlan(
      {},
      buildFormData({ eventId: event.id, floorPlan: "{not json" })
    );
    expect(result.error).toContain("Invalid");
  });

  it("saves a polygon room with vertices", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const polygon = [
      { xCm: 0, yCm: 0 },
      { xCm: 800, yCm: 0 },
      { xCm: 800, yCm: 300 },
      { xCm: 400, yCm: 300 },
      { xCm: 400, yCm: 500 },
      { xCm: 0, yCm: 500 },
    ];
    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "L-shaped hall",
            x: 0,
            y: 0,
            widthCm: 800,
            heightCm: 500,
            vertices: polygon,
          },
        ],
        tables: [],
      },
    });
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan?.rooms[0].vertices).toEqual(polygon);
  });

  it("rejects a polygon with fewer than 3 vertices", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });
    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Tiny",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
            vertices: [
              { xCm: 0, yCm: 0 },
              { xCm: 500, yCm: 0 },
            ],
          },
        ],
        tables: [],
      },
    });
    expect(result.error).toContain("validation failed");
  });

  it("rejects a polygon with out-of-range coordinates", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });
    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Bad",
            x: 0,
            y: 0,
            widthCm: 500,
            heightCm: 500,
            vertices: [
              { xCm: 0, yCm: 0 },
              { xCm: 500, yCm: 0 },
              { xCm: -50, yCm: 500 },
            ],
          },
        ],
        tables: [],
      },
    });
    expect(result.error).toContain("validation failed");
  });

  it("saves a table with a non-orthogonal rotation as-is", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Hall",
            x: 0,
            y: 0,
            widthCm: 800,
            heightCm: 500,
          },
        ],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 37,
            x: 100,
            y: 100,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan?.tables[0].rotationDeg).toBe(37);
  });

  it("normalises a rotation > 360 into [0, 360)", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Hall",
            x: 0,
            y: 0,
            widthCm: 800,
            heightCm: 500,
          },
        ],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 370,
            x: 100,
            y: 100,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan?.tables[0].rotationDeg).toBe(10);
  });

  it("normalises a negative rotation into [0, 360)", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Hall",
            x: 0,
            y: 0,
            widthCm: 800,
            heightCm: 500,
          },
        ],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: -5,
            x: 100,
            y: 100,
            assignedApplicationId: null,
          },
        ],
      },
    });
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ floorPlan: events.floorPlan })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.floorPlan?.tables[0].rotationDeg).toBe(355);
  });

  it("rejects a non-finite rotation", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [sizeWithDims],
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    // NaN doesn't survive JSON.stringify, so build the payload with a
    // Number-valued sentinel that fails Zod's `.finite()` check via
    // string substitution. Easier: send the JSON manually.
    const payload = {
      rooms: [
        {
          id: "r-1",
          name: "Hall",
          x: 0,
          y: 0,
          widthCm: 800,
          heightCm: 500,
        },
      ],
      tables: [
        {
          id: "t-1",
          label: "T1",
          tableSizeOptionId: "ts-std",
          roomId: "r-1",
          rotationDeg: "NaN",
          x: 100,
          y: 100,
          assignedApplicationId: null,
        },
      ],
    };
    const formData = buildFormData({
      eventId: event.id,
      floorPlan: JSON.stringify(payload),
    });
    const result = await saveFloorPlan({}, formData);
    expect(result.error).toContain("validation failed");
  });

  it("preserves vertices through migrateLegacyPlan on read", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const polygon = [
      { xCm: 0, yCm: 0 },
      { xCm: 600, yCm: 0 },
      { xCm: 600, yCm: 400 },
      { xCm: 0, yCm: 400 },
    ];
    await submit({
      eventId: event.id,
      plan: {
        rooms: [
          {
            id: "r-1",
            name: "Square",
            x: 0,
            y: 0,
            widthCm: 600,
            heightCm: 400,
            vertices: polygon,
          },
        ],
        tables: [],
      },
    });
    const { getFloorPlanForEvent } = await import("@/lib/floor-plans/queries");
    const resolved = await getFloorPlanForEvent(event.id);
    expect(resolved?.rooms[0].vertices).toEqual(polygon);
  });
});
