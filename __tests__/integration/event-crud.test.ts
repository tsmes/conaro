import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  findEventsByConventionId,
  buildFormData,
} from "../helpers/db";
import {
  createEvent,
  updateEvent,
  openApplications,
  closeApplications,
} from "@/app/(authenticated)/conventions/manage/events/actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { eq } from "drizzle-orm";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("event CRUD", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  describe("createEvent", () => {
    it("creates event with required fields only", async () => {
      const { profile, convention } = await createTestOrganizer();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = buildFormData({
        name: "Summer Con 2026",
        eventStartDate: "2026-07-15",
      });

      const result = await createEvent({}, formData);
      expect(result.success).toBe(true);

      const eventList = await findEventsByConventionId(convention.id);
      expect(eventList).toHaveLength(1);
      expect(eventList[0].name).toBe("Summer Con 2026");
      expect(eventList[0].eventStartDate).toBe("2026-07-15");
      expect(eventList[0].status).toBe("draft");
      expect(eventList[0].fieldRequirements).toBeDefined();
    });

    it("creates event with all fields", async () => {
      const { profile, convention } = await createTestOrganizer();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = buildFormData({
        name: "Full Event",
        description: "A comprehensive event",
        eventStartDate: "2026-08-01",
        eventEndDate: "2026-08-03",
        applicationOpenDate: "2026-05-01",
        applicationCloseDate: "2026-06-30",
        venueName: "Convention Center",
        venueAddress: "123 Main St",
        venueCity: "Oslo",
        venueCountry: "Norway",
        mapEmbedUrl: "https://maps.google.com/embed?q=Oslo",
        availableStands: "50",
        tableDimensions: "2m x 1m",
        priceInfo: "$100 per table",
        setupTime: "8:00 AM",
        teardownTime: "6:00 PM",
        amenities_electricity: "on",
        amenities_wifi: "on",
        amenities_tables: "on",
        amenities_chairs: "on",
        amenities_other: "Display racks",
      });

      const result = await createEvent({}, formData);
      expect(result.success).toBe(true);

      const eventList = await findEventsByConventionId(convention.id);
      expect(eventList).toHaveLength(1);

      const event = eventList[0];
      expect(event.venueName).toBe("Convention Center");
      expect(event.availableStands).toBe(50);
      expect(event.amenities).toEqual({
        electricity: true,
        wifi: true,
        tables: true,
        chairs: true,
        other: "Display racks",
      });
    });

    it("returns field errors for missing name", async () => {
      const { profile } = await createTestOrganizer();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = buildFormData({
        name: "",
        eventStartDate: "2026-07-15",
      });

      const result = await createEvent({}, formData);
      expect(result.fieldErrors?.name).toBeDefined();
    });

    it("creates multiple events under one convention", async () => {
      const { profile, convention } = await createTestOrganizer();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      await createEvent(
        {},
        buildFormData({ name: "Event 1", eventStartDate: "2026-07-01" })
      );
      await createEvent(
        {},
        buildFormData({ name: "Event 2", eventStartDate: "2026-08-01" })
      );

      const eventList = await findEventsByConventionId(convention.id);
      expect(eventList).toHaveLength(2);
    });
  });

  describe("updateEvent", () => {
    it("updates an existing event", async () => {
      const { profile, convention } = await createTestOrganizer();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      await createEvent(
        {},
        buildFormData({ name: "Original", eventStartDate: "2026-07-01" })
      );

      const eventList = await findEventsByConventionId(convention.id);
      const eventId = eventList[0].id;

      const formData = buildFormData({
        eventId,
        name: "Updated Name",
        eventStartDate: "2026-07-15",
      });

      const result = await updateEvent({}, formData);
      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));
      expect(updated.name).toBe("Updated Name");
      expect(updated.eventStartDate).toBe("2026-07-15");
    });

    it("returns error for non-existent event", async () => {
      const { profile } = await createTestOrganizer();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = buildFormData({
        eventId: "non-existent-id",
        name: "Test",
        eventStartDate: "2026-07-01",
      });

      const result = await updateEvent({}, formData);
      expect(result.error).toBe("Event not found");
    });
  });

  describe("status transitions", () => {
    async function createPublishedEvent(
      profileId: string,
      conventionId: string
    ) {
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId },
      });

      // Create event and move it to published via direct DB update so these
      // tests don't depend on the publishEvent action.
      await createEvent(
        {},
        buildFormData({ name: "Test Event", eventStartDate: "2026-07-01" })
      );

      const eventList = await findEventsByConventionId(conventionId);
      const [event] = eventList;

      await db
        .update(events)
        .set({
          status: "published",
          applicationOpenDate: "2026-06-01",
          applicationCloseDate: "2026-06-30",
        })
        .where(eq(events.id, event.id));

      return { ...event, status: "published" as const };
    }

    it("transitions published -> accepting_applications", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createPublishedEvent(profile.id, convention.id);

      const result = await openApplications(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.status).toBe("accepting_applications");
    });

    it("rejects opening applications when not in published", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createPublishedEvent(profile.id, convention.id);

      // Open first
      await openApplications({}, buildFormData({ eventId: event.id }));

      // Try to open again
      const result = await openApplications(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.error).toContain("published");
    });

    it("transitions accepting_applications -> reviewing", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createPublishedEvent(profile.id, convention.id);

      await openApplications({}, buildFormData({ eventId: event.id }));

      const result = await closeApplications(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(events)
        .where(eq(events.id, event.id));
      expect(updated.status).toBe("reviewing");
    });

    it("rejects closing applications when not accepting", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createPublishedEvent(profile.id, convention.id);

      // Still in published — can't close
      const result = await closeApplications(
        {},
        buildFormData({ eventId: event.id })
      );
      expect(result.error).toContain("accepting applications");
    });
  });
});
