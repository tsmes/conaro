import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
  createTestApplication,
  buildFormData,
} from "../helpers/db";
import {
  setApplicationDecision,
  confirmPayment,
  revokeApplication,
  toggleApplicationPin,
  setBulkDecision,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("application review", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  describe("setApplicationDecision", () => {
    it("accepts an application", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "reviewing",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await setApplicationDecision(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          decision: "accepted",
        })
      );

      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.status).toBe("accepted");
    });

    it("rejects an application", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "reviewing",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await setApplicationDecision(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          decision: "rejected",
        })
      );

      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.status).toBe("rejected");
    });

    it("can toggle decision before publish", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "reviewing",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      await setApplicationDecision(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          decision: "accepted",
        })
      );

      await setApplicationDecision(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          decision: "rejected",
        })
      );

      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.status).toBe("rejected");
    });

    it("rejects when event is not in reviewing status", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "accepting_applications",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await setApplicationDecision(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          decision: "accepted",
        })
      );

      expect(result.error).toContain("reviewing");
    });
  });

  describe("confirmPayment", () => {
    it("toggles payment status", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id,
        { status: "accepted" }
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      // Mark as paid
      const result = await confirmPayment(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
        })
      );
      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.paymentConfirmed).toBe(true);

      // Toggle back to unpaid
      await confirmPayment(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
        })
      );

      const [toggled] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(toggled.paymentConfirmed).toBe(false);
    });
  });

  describe("revokeApplication", () => {
    it("revokes an accepted application with message", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id,
        { status: "accepted" }
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await revokeApplication(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          message: "Payment not received",
        })
      );

      expect(result.success).toBe(true);

      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.status).toBe("revoked");
      expect(updated.responseMessage).toBe("Payment not received");
    });

    it("only works on accepted applications", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(
        event.id,
        artist.profile.id,
        { status: "rejected" }
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await revokeApplication(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          message: "test",
        })
      );

      expect(result.error).toContain("accepted");
    });
  });

  describe("toggleApplicationPin", () => {
    it("pins an application when event is in reviewing status", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, { status: "reviewing" });
      const artist = await createTestArtist();
      const application = await createTestApplication(event.id, artist.profile.id);

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await toggleApplicationPin(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          pinned: "true",
        })
      );

      expect(result.success).toBe(true);
      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.pinned).toBe(true);
    });

    it("unpins when passed 'false'", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, { status: "reviewing" });
      const artist = await createTestArtist();
      const application = await createTestApplication(event.id, artist.profile.id, {
        pinned: true,
      });

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      await toggleApplicationPin(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          pinned: "false",
        })
      );

      const [updated] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, application.id));
      expect(updated.pinned).toBe(false);
    });

    it("refuses to pin when event is not in reviewing status", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(event.id, artist.profile.id);

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await toggleApplicationPin(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          pinned: "true",
        })
      );

      expect(result.error).toContain("reviewing");
    });

    it("refuses non-organizer callers", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, { status: "reviewing" });
      const artist = await createTestArtist();
      const application = await createTestApplication(event.id, artist.profile.id);

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "artist", profileId: artist.profile.id },
      });

      const result = await toggleApplicationPin(
        {},
        buildFormData({
          applicationId: application.id,
          eventId: event.id,
          pinned: "true",
        })
      );

      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("setBulkDecision", () => {
    it("accepts multiple applications in one call", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, { status: "reviewing" });
      const artistA = await createTestArtist("a@test.com", "Artist A");
      const artistB = await createTestArtist("b@test.com", "Artist B");
      const appA = await createTestApplication(event.id, artistA.profile.id);
      const appB = await createTestApplication(event.id, artistB.profile.id);

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = new FormData();
      formData.set("eventId", event.id);
      formData.set("decision", "accepted");
      formData.append("applicationIds", appA.id);
      formData.append("applicationIds", appB.id);

      const result = await setBulkDecision({}, formData);
      expect(result.success).toBe(true);

      const [updatedA] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, appA.id));
      const [updatedB] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, appB.id));
      expect(updatedA.status).toBe("accepted");
      expect(updatedB.status).toBe("accepted");
    });

    it("rejects when any applicationId does not belong to the event", async () => {
      const { profile, convention } = await createTestOrganizer();
      const eventA = await createTestEvent(convention.id, { status: "reviewing" });
      const eventB = await createTestEvent(convention.id, {
        status: "reviewing",
        name: "Other Event",
      });
      const artistA = await createTestArtist("a@test.com", "Artist A");
      const artistB = await createTestArtist("b@test.com", "Artist B");
      const appA = await createTestApplication(eventA.id, artistA.profile.id);
      const appOtherEvent = await createTestApplication(
        eventB.id,
        artistB.profile.id
      );

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = new FormData();
      formData.set("eventId", eventA.id);
      formData.set("decision", "rejected");
      formData.append("applicationIds", appA.id);
      formData.append("applicationIds", appOtherEvent.id);

      const result = await setBulkDecision({}, formData);
      expect(result.error).toMatch(/do not belong/);

      const [untouched] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, appA.id));
      expect(untouched.status).toBe("submitted");
    });

    it("requires at least one applicationId", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, { status: "reviewing" });

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = new FormData();
      formData.set("eventId", event.id);
      formData.set("decision", "accepted");

      const result = await setBulkDecision({}, formData);
      expect(result.error).toMatch(/at least one/i);
    });

    it("refuses when event is not in reviewing status", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
      });
      const artist = await createTestArtist();
      const application = await createTestApplication(event.id, artist.profile.id);

      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const formData = new FormData();
      formData.set("eventId", event.id);
      formData.set("decision", "accepted");
      formData.append("applicationIds", application.id);

      const result = await setBulkDecision({}, formData);
      expect(result.error).toContain("reviewing");
    });
  });
});
