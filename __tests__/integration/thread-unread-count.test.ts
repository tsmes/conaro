import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  createTestArtist,
  createTestApplication,
} from "../helpers/db";
import { getUnreadThreadCountForEvent } from "@/lib/threads/queries";
import { db } from "@/lib/db";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import { applications } from "@/lib/db/schema/applications";

async function acceptedArtist(eventId: string, email: string, name: string) {
  const artist = await createTestArtist(email, name);
  const app = await createTestApplication(eventId, artist.profile.id);
  await db
    .update(applications)
    .set({ status: "accepted" })
    .where(eq(applications.id, app.id));
  return artist;
}

async function insertThread(
  eventId: string,
  artistProfileId: string,
  organizerLastReadAt: Date | null = null,
  lastMessageAt: Date = new Date()
) {
  const [thread] = await db
    .insert(eventThreads)
    .values({
      eventId,
      artistProfileId,
      lastMessageAt,
      organizerLastReadAt,
    })
    .returning();
  return thread;
}

async function insertMessage(
  threadId: string,
  authorProfileId: string,
  createdAt: Date
) {
  await db.insert(eventThreadMessages).values({
    threadId,
    authorProfileId,
    body: "x",
    createdAt,
  });
}

describe("getUnreadThreadCountForEvent", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("returns 0 when the event has no threads", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    expect(await getUnreadThreadCountForEvent(event.id)).toBe(0);
  });

  it("counts a thread whose only message is from the artist and has never been read by the organizer", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await acceptedArtist(event.id, "a@test.com", "A");
    const now = new Date();
    const thread = await insertThread(
      event.id,
      artist.profile.id,
      null,
      now
    );
    await insertMessage(thread.id, artist.profile.id, now);
    expect(await getUnreadThreadCountForEvent(event.id)).toBe(1);
  });

  it("does not count a thread once the organizer has read it", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await acceptedArtist(event.id, "a@test.com", "A");
    const t0 = new Date("2026-04-20T10:00:00Z");
    const t1 = new Date("2026-04-20T11:00:00Z");
    const thread = await insertThread(event.id, artist.profile.id, t1, t0);
    await insertMessage(thread.id, artist.profile.id, t0);
    expect(await getUnreadThreadCountForEvent(event.id)).toBe(0);
  });

  it("does not count a thread whose latest author is the organizer", async () => {
    const { profile: organizer, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await acceptedArtist(event.id, "a@test.com", "A");
    const t0 = new Date("2026-04-20T10:00:00Z");
    const t1 = new Date("2026-04-20T11:00:00Z");
    const thread = await insertThread(event.id, artist.profile.id, null, t1);
    await insertMessage(thread.id, artist.profile.id, t0);
    await insertMessage(thread.id, organizer.id, t1);
    expect(await getUnreadThreadCountForEvent(event.id)).toBe(0);
  });

  it("counts again when the artist replies after the organizer", async () => {
    const { profile: organizer, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await acceptedArtist(event.id, "a@test.com", "A");
    const t0 = new Date("2026-04-20T10:00:00Z");
    const t1 = new Date("2026-04-20T11:00:00Z");
    const t2 = new Date("2026-04-20T12:00:00Z");
    const thread = await insertThread(event.id, artist.profile.id, t1, t2);
    await insertMessage(thread.id, artist.profile.id, t0);
    await insertMessage(thread.id, organizer.id, t1);
    await insertMessage(thread.id, artist.profile.id, t2);
    expect(await getUnreadThreadCountForEvent(event.id)).toBe(1);
  });

  it("sums across multiple unread threads", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artistA = await acceptedArtist(event.id, "a@test.com", "A");
    const artistB = await acceptedArtist(event.id, "b@test.com", "B");

    const now = new Date();
    const threadA = await insertThread(event.id, artistA.profile.id, null, now);
    await insertMessage(threadA.id, artistA.profile.id, now);
    const threadB = await insertThread(event.id, artistB.profile.id, null, now);
    await insertMessage(threadB.id, artistB.profile.id, now);

    expect(await getUnreadThreadCountForEvent(event.id)).toBe(2);
  });

  it("scopes to the given event", async () => {
    const { convention } = await createTestOrganizer();
    const eventA = await createTestEvent(convention.id);
    const eventB = await createTestEvent(convention.id);
    const artist = await acceptedArtist(eventA.id, "a@test.com", "A");

    const now = new Date();
    const thread = await insertThread(eventA.id, artist.profile.id, null, now);
    await insertMessage(thread.id, artist.profile.id, now);

    expect(await getUnreadThreadCountForEvent(eventA.id)).toBe(1);
    expect(await getUnreadThreadCountForEvent(eventB.id)).toBe(0);
  });
});
