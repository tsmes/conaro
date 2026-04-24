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
  notifyEventPublished,
  notifyThreadMessageFromArtist,
  notifyThreadMessageFromOrganizer,
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

  describe("notifyEventPublished", () => {
    it("creates event_published notifications for followers", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      await db.insert(conventionFollows).values({
        profileId: artist.profile.id,
        conventionId: convention.id,
      });

      await notifyEventPublished(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("event_published");
      expect(notifs[0].message).toContain(event.name);
    });

    it("creates new_event notifications for opted-in subscribers", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      // Opt in via emailEnabled (the toggle users control)
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "new_event",
        emailEnabled: true,
      });

      await notifyEventPublished(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("new_event");
    });

    it("does not notify subscribers who opted out", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      // Row exists but emailEnabled=false → not opted in
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "new_event",
        emailEnabled: false,
      });

      await notifyEventPublished(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(0);
    });

    it("deduplicates followers who also have 'any new event' preference", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      await db.insert(conventionFollows).values({
        profileId: artist.profile.id,
        conventionId: convention.id,
      });
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "new_event",
        emailEnabled: true,
      });

      await notifyEventPublished(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("event_published"); // follower wins
    });
  });

  describe("notifyEventOpened", () => {
    it("creates event_opened notifications for followers only", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      await db.insert(conventionFollows).values({
        profileId: artist.profile.id,
        conventionId: convention.id,
      });

      await notifyEventOpened(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("event_opened");
      expect(notifs[0].message).toContain("Applications are now open");
    });

    it("does NOT notify 'any new event' subscribers (they're notified on publish)", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id);
      const artist = await createTestArtist();

      // Opted-in subscriber but not a follower — should NOT get notification here
      await db.insert(notificationPreferences).values({
        profileId: artist.profile.id,
        notificationType: "new_event",
        emailEnabled: true,
      });

      await notifyEventOpened(event.id, event.name, convention.id);

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(0);
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

  describe("notifyThreadMessageFromArtist", () => {
    it("creates a notification for the organizer with a thread deep-link", async () => {
      const { profile } = await createTestOrganizer();
      const artist = await createTestArtist();

      await notifyThreadMessageFromArtist(
        profile.id,
        artist.profile.id,
        "Elena",
        "ev-1",
        "Kawaiicon 2026"
      );

      const notifs = await findNotificationsByProfileId(profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("thread_message_from_artist");
      expect(notifs[0].message).toContain("Elena");
      expect(notifs[0].message).toContain("Kawaiicon 2026");
      expect(notifs[0].link).toBe(
        `/conventions/manage/events/ev-1#thread-${artist.profile.id}`
      );
    });
  });

  describe("notifyThreadMessageFromOrganizer", () => {
    it("creates a notification for the artist with a thread deep-link", async () => {
      const artist = await createTestArtist();

      await notifyThreadMessageFromOrganizer(
        artist.profile.id,
        "ev-1",
        "Kawaiicon 2026"
      );

      const notifs = await findNotificationsByProfileId(artist.profile.id);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe("thread_message_from_organizer");
      expect(notifs[0].message).toContain("Kawaiicon 2026");
      expect(notifs[0].link).toBe("/events/ev-1#thread");
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
