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
  dimensions: "120x80 cm",
  priceNok: 1200,
  widthCm: 120,
  depthCm: 80,
};

const sizeMissingDims: TableSizeOption = {
  id: "ts-nodims",
  label: "No dims",
  dimensions: "",
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
        rooms: [],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-ghost",
            x: 0,
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
        rooms: [],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-nodims",
            x: 0,
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
        rooms: [],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            x: 0,
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
        rooms: [],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            x: 0,
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
        rooms: [],
        tables: [
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            x: 0,
            y: 0,
            assignedApplicationId: app.id,
          },
          {
            id: "t-2",
            label: "T2",
            tableSizeOptionId: "ts-std",
            x: 200,
            y: 0,
            assignedApplicationId: app.id,
          },
        ],
      },
    });
    expect(result.error).toContain("more than one table");
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
});
