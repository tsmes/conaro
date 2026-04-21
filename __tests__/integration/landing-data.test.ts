import { describe, it, expect, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestArtist,
  createTestOrganizer,
  createTestEvent,
  createTestApplication,
} from "../helpers/db";
import { db } from "@/lib/db";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { notifications } from "@/lib/db/schema/notifications";
import {
  getUpcomingEvents,
  getArtistLandingContext,
  getLatestNotifications,
  getUnreadNotificationCount,
} from "@/lib/landing/data";

describe("landing data helpers", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("getUpcomingEvents", () => {
    it("returns non-draft events joined with their conventions, sorted by start date", async () => {
      const { convention } = await createTestOrganizer();
      const later = await createTestEvent(convention.id, {
        name: "Later event",
        eventStartDate: "2026-09-10",
        status: "accepting_applications",
      });
      const sooner = await createTestEvent(convention.id, {
        name: "Sooner event",
        eventStartDate: "2026-05-10",
        status: "accepting_applications",
      });
      await createTestEvent(convention.id, {
        name: "Hidden draft",
        eventStartDate: "2026-06-01",
        status: "draft",
      });

      const result = await getUpcomingEvents();

      expect(result.map((e) => e.id)).toEqual([sooner.id, later.id]);
      expect(result[0].conventionName).toBe(convention.name);
      expect(result.find((e) => e.name === "Hidden draft")).toBeUndefined();
    });
  });

  describe("getArtistLandingContext", () => {
    it("aggregates follows, applications, and counts for the artist", async () => {
      const { convention } = await createTestOrganizer(
        "org-a@test.com",
        "Con A"
      );
      const { convention: convention2 } = await createTestOrganizer(
        "org-b@test.com",
        "Con B"
      );
      const artist = await createTestArtist();

      const eventA = await createTestEvent(convention.id, {
        name: "A",
        eventStartDate: "2026-05-01",
      });
      const eventB = await createTestEvent(convention2.id, {
        name: "B",
        eventStartDate: "2026-05-02",
      });

      await createTestApplication(eventA.id, artist.profile.id, {
        status: "accepted",
      });
      await createTestApplication(eventB.id, artist.profile.id, {
        status: "under_review",
      });

      await db.insert(conventionFollows).values({
        profileId: artist.profile.id,
        conventionId: convention.id,
      });

      const ctx = await getArtistLandingContext(artist.profile.id);

      expect(ctx.followedConventionIds.has(convention.id)).toBe(true);
      expect(ctx.followedConventionIds.has(convention2.id)).toBe(false);
      expect(ctx.applicationsByEventId.get(eventA.id)?.status).toBe("accepted");
      expect(ctx.applicationsByEventId.get(eventB.id)?.status).toBe(
        "under_review"
      );
      expect(ctx.counts).toEqual({
        total: 2,
        accepted: 1,
        underReview: 1,
        following: 1,
      });
    });

    it("returns empty context for an artist with no data", async () => {
      const artist = await createTestArtist();
      const ctx = await getArtistLandingContext(artist.profile.id);
      expect(ctx.followedConventionIds.size).toBe(0);
      expect(ctx.applicationsByEventId.size).toBe(0);
      expect(ctx.counts.total).toBe(0);
    });
  });

  describe("getLatestNotifications", () => {
    it("returns the most recent notifications up to the limit", async () => {
      const artist = await createTestArtist();

      await db.insert(notifications).values([
        {
          recipientProfileId: artist.profile.id,
          type: "new_event",
          message: "Oldest",
          createdAt: new Date("2026-04-01T10:00:00Z"),
        },
        {
          recipientProfileId: artist.profile.id,
          type: "new_event",
          message: "Middle",
          createdAt: new Date("2026-04-10T10:00:00Z"),
        },
        {
          recipientProfileId: artist.profile.id,
          type: "new_event",
          message: "Newest",
          createdAt: new Date("2026-04-20T10:00:00Z"),
        },
      ]);

      const result = await getLatestNotifications(artist.profile.id, 2);
      expect(result.map((n) => n.message)).toEqual(["Newest", "Middle"]);
    });
  });

  describe("getUnreadNotificationCount", () => {
    it("counts unread notifications for the given profile", async () => {
      const artist = await createTestArtist();

      await db.insert(notifications).values([
        {
          recipientProfileId: artist.profile.id,
          type: "new_event",
          message: "A",
          isRead: false,
        },
        {
          recipientProfileId: artist.profile.id,
          type: "new_event",
          message: "B",
          isRead: true,
        },
        {
          recipientProfileId: artist.profile.id,
          type: "new_event",
          message: "C",
          isRead: false,
        },
      ]);

      expect(await getUnreadNotificationCount(artist.profile.id)).toBe(2);
    });
  });
});
