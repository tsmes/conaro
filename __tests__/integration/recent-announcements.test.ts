import { describe, it, expect, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
} from "../helpers/db";
import { getRecentAnnouncementsForConvention } from "@/lib/conventions/queries";
import { db } from "@/lib/db";
import { eventAnnouncements } from "@/lib/db/schema/event-announcements";

describe("getRecentAnnouncementsForConvention", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("returns an empty list when the convention has no announcements", async () => {
    const { convention } = await createTestOrganizer();
    const result = await getRecentAnnouncementsForConvention(convention.id);
    expect(result).toEqual([]);
  });

  it("returns announcements across all events in the convention, newest first", async () => {
    const { profile: organizer, convention } = await createTestOrganizer();
    const eventA = await createTestEvent(convention.id);
    const eventB = await createTestEvent(convention.id);

    await db.insert(eventAnnouncements).values([
      {
        eventId: eventA.id,
        authorProfileId: organizer.id,
        subject: "Oldest",
        body: "x",
        createdAt: new Date("2026-04-10T10:00:00Z"),
      },
      {
        eventId: eventB.id,
        authorProfileId: organizer.id,
        subject: "Newest",
        body: "y",
        createdAt: new Date("2026-04-22T10:00:00Z"),
      },
      {
        eventId: eventA.id,
        authorProfileId: organizer.id,
        subject: "Middle",
        body: "z",
        createdAt: new Date("2026-04-15T10:00:00Z"),
      },
    ]);

    const result = await getRecentAnnouncementsForConvention(convention.id);
    expect(result.map((r) => r.subject)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
    expect(result[0].eventName).toBe(eventB.name);
  });

  it("respects the limit parameter", async () => {
    const { profile: organizer, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    await db.insert(eventAnnouncements).values(
      Array.from({ length: 5 }).map((_, i) => ({
        eventId: event.id,
        authorProfileId: organizer.id,
        subject: `a${i}`,
        body: "x",
        createdAt: new Date(`2026-04-${10 + i}T10:00:00Z`),
      }))
    );

    const result = await getRecentAnnouncementsForConvention(convention.id, 2);
    expect(result).toHaveLength(2);
    expect(result[0].subject).toBe("a4");
    expect(result[1].subject).toBe("a3");
  });

  it("excludes announcements from other conventions", async () => {
    const { profile: organizerA, convention: conventionA } =
      await createTestOrganizer();
    const { convention: conventionB } = await createTestOrganizer(
      "other@test.com",
      "Other con"
    );
    const eventA = await createTestEvent(conventionA.id);
    const eventB = await createTestEvent(conventionB.id);

    await db.insert(eventAnnouncements).values([
      {
        eventId: eventA.id,
        authorProfileId: organizerA.id,
        subject: "Mine",
        body: "x",
      },
      {
        eventId: eventB.id,
        authorProfileId: organizerA.id,
        subject: "Someone else's",
        body: "y",
      },
    ]);

    const result = await getRecentAnnouncementsForConvention(conventionA.id);
    expect(result.map((r) => r.subject)).toEqual(["Mine"]);
  });
});
