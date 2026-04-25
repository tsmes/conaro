import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  buildFormData,
} from "../helpers/db";
import {
  publishFloorPlan,
  unpublishFloorPlan,
  setFloorPlanAutoPublish,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("floor-plan publish actions", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  describe("publishFloorPlan", () => {
    it("rejects unauthenticated callers", async () => {
      mockAuth.mockResolvedValue(null);
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });

      const result = await publishFloorPlan(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.error).toBe("Unauthorized");
    });

    it("rejects non-organizer roles", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "artist", profileId: profile.id },
      });

      const result = await publishFloorPlan(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.error).toBe("Unauthorized");
    });

    it("rejects when the event is not in results_published", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "reviewing",
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await publishFloorPlan(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.error).toMatch(/results must be published/i);

      const [row] = await db
        .select({
          floorPlanPublishedAt: events.floorPlanPublishedAt,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.floorPlanPublishedAt).toBeNull();
    });

    it("sets floorPlanPublishedAt when results are published", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await publishFloorPlan(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.success).toBe(true);

      const [row] = await db
        .select({
          floorPlanPublishedAt: events.floorPlanPublishedAt,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.floorPlanPublishedAt).toBeInstanceOf(Date);
    });
  });

  describe("unpublishFloorPlan", () => {
    it("clears floorPlanPublishedAt without checking event status", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
        floorPlanPublishedAt: new Date(),
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await unpublishFloorPlan(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.success).toBe(true);

      const [row] = await db
        .select({
          floorPlanPublishedAt: events.floorPlanPublishedAt,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.floorPlanPublishedAt).toBeNull();
    });
  });

  describe("setFloorPlanAutoPublish", () => {
    it("accepts a positive integer", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await setFloorPlanAutoPublish(
        {},
        buildFormData({ eventId: event.id, daysBefore: "3" })
      );
      expect(result.success).toBe(true);

      const [row] = await db
        .select({
          floorPlanAutoPublishDaysBefore:
            events.floorPlanAutoPublishDaysBefore,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.floorPlanAutoPublishDaysBefore).toBe(3);
    });

    it("clears the setting when daysBefore is empty", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
        floorPlanAutoPublishDaysBefore: 5,
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await setFloorPlanAutoPublish(
        {},
        buildFormData({ eventId: event.id, daysBefore: "" })
      );
      expect(result.success).toBe(true);

      const [row] = await db
        .select({
          floorPlanAutoPublishDaysBefore:
            events.floorPlanAutoPublishDaysBefore,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.floorPlanAutoPublishDaysBefore).toBeNull();
    });

    it("rejects zero, negative, and non-integer values", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      for (const bad of ["0", "-3", "1.5", "abc"]) {
        const result = await setFloorPlanAutoPublish(
          {},
          buildFormData({ eventId: event.id, daysBefore: bad })
        );
        expect(result.fieldErrors?.daysBefore).toBeDefined();
      }

      const [row] = await db
        .select({
          floorPlanAutoPublishDaysBefore:
            events.floorPlanAutoPublishDaysBefore,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.floorPlanAutoPublishDaysBefore).toBeNull();
    });
  });
});
