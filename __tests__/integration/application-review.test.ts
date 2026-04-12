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
} from "@/app/conventions/manage/events/[eventId]/applications/actions";
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
});
