import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
  createTestApplication,
  findNotificationsByProfileId,
} from "../helpers/db";
import { db } from "@/lib/db";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import {
  notifyEventOpened,
  notifyResultsPublished,
  notifyApplicationRevoked,
  notifyNewApplication,
} from "@/lib/notifications/triggers";

// Mock the email adapter
vi.mock("@/lib/email", () => ({
  emailAdapter: {
    sendEmail: vi.fn(),
  },
}));

import { emailAdapter } from "@/lib/email";

describe("notification triggers", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  describe("notifyEventOpened", () => {
    it("creates notifications for convention followers", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      // Follow the convention
      await db.insert(conventionFollows).values({
        profileId: artist.profile.id,
        conventionId: convention.id,
      });

      await notifyEventOpened(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("event_opened");
      expect(notifs[0].message).toContain(event.name);
      expect(notifs[0].link).toBe(`/events/${event.id}`);
    });

    it("includes artists with 'any new event' preference", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      // Set "new_event" preference (not following the convention)
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "new_event",
        emailEnabled: false,
      });

      await notifyEventOpened(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("new_event");
    });

    it("deduplicates followers who also have 'any new event' preference", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      // Both follow AND have new_event preference
      await db.insert(conventionFollows).values({
        profileId: artist.profile.id,
        conventionId: convention.id,
      });
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "new_event",
        emailEnabled: false,
      });

      await notifyEventOpened(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1); // Not 2
    });
  });

  describe("notifyResultsPublished", () => {
    it("creates notifications for all applicants", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist1 = await createTestArtist("a1@test.com", "Artist 1");
      const artist2 = await createTestArtist("a2@test.com", "Artist 2");

      await createTestApplication(event.id, artist1.profile.id);
      await createTestApplication(event.id, artist2.profile.id);

      await notifyResultsPublished(event.id, event.name);

      const notifs1 = await findNotificationsByProfileId(artist1.profile.id);
      const notifs2 = await findNotificationsByProfileId(artist2.profile.id);
      expect(notifs1).toHaveLength(1);
      expect(notifs2).toHaveLength(1);
      expect(notifs1[0].type).toBe("results_published");
    });
  });

  describe("notifyApplicationRevoked", () => {
    it("creates notification for affected artist", async () => {
      const artist = await createTestArtist();

      await notifyApplicationRevoked(artist.profile.id, "Test Event");

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("application_revoked");
      expect(notifs[0].message).toContain("revoked");
    });
  });

  describe("notifyNewApplication", () => {
    it("creates notification for organizer", async () => {
      const { profile, convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);

      await notifyNewApplication(
        profile.id,
        "Test Artist",
        event.id,
        event.name
      );

      const notifs = await findNotificationsByProfileId(profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("new_application");
      expect(notifs[0].message).toContain("Test Artist");
    });
  });

  describe("email sending", () => {
    it("sends email when preference is enabled", async () => {
      const artist = await createTestArtist();

      // Enable email for application_revoked
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "application_revoked",
        emailEnabled: true,
      });

      await notifyApplicationRevoked(artist.profile.id, "Test Event");

      expect(emailAdapter.sendEmail).toHaveBeenCalledOnce();
    });

    it("does NOT send email when preference is disabled", async () => {
      const artist = await createTestArtist();

      // No preference row = defaults to false
      await notifyApplicationRevoked(artist.profile.id, "Test Event");

      expect(emailAdapter.sendEmail).not.toHaveBeenCalled();
    });
  });
});
