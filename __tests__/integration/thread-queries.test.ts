import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
} from "../helpers/db";
import { db } from "@/lib/db";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import {
  getThreadForArtist,
  getThreadsForOrganizer,
  getThreadByIdForOrganizer,
} from "@/lib/threads/queries";

describe("thread queries", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("getThreadForArtist returns null when no thread exists", async () => {
    const artist = await createTestArtist();
    const result = await getThreadForArtist("evt-missing", artist.profile.id);
    expect(result).toBeNull();
  });

  it("getThreadForArtist returns the thread and messages in order", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await createTestArtist();

    const [thread] = await db
      .insert(eventThreads)
      .values({
        eventId: event.id,
        artistProfileId: artist.profile.id,
        lastMessageAt: new Date(),
      })
      .returning();

    await db.insert(eventThreadMessages).values([
      {
        threadId: thread.id,
        authorProfileId: artist.profile.id,
        body: "First question",
        createdAt: new Date("2026-04-20T10:00:00Z"),
      },
      {
        threadId: thread.id,
        authorProfileId: artist.profile.id,
        body: "Follow-up",
        createdAt: new Date("2026-04-20T11:00:00Z"),
      },
    ]);

    const result = await getThreadForArtist(event.id, artist.profile.id);
    expect(result).not.toBeNull();
    expect(result!.messages).toHaveLength(2);
    expect(result!.messages[0].body).toBe("First question");
    expect(result!.messages[1].body).toBe("Follow-up");
  });

  it("getThreadsForOrganizer sorts by lastMessageAt desc and flags unread correctly", async () => {
    const { profile: organizer, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artistA = await createTestArtist("a@test.com", "Artist A");
    const artistB = await createTestArtist("b@test.com", "Artist B");

    const [threadA] = await db
      .insert(eventThreads)
      .values({
        eventId: event.id,
        artistProfileId: artistA.profile.id,
        lastMessageAt: new Date("2026-04-20T10:00:00Z"),
        organizerLastReadAt: new Date("2026-04-20T10:00:00Z"),
      })
      .returning();

    // Artist A's last message: before the organizer's read → not unread.
    await db.insert(eventThreadMessages).values({
      threadId: threadA.id,
      authorProfileId: artistA.profile.id,
      body: "older question, already read",
      createdAt: new Date("2026-04-20T09:30:00Z"),
    });

    const [threadB] = await db
      .insert(eventThreads)
      .values({
        eventId: event.id,
        artistProfileId: artistB.profile.id,
        lastMessageAt: new Date("2026-04-21T12:00:00Z"),
        organizerLastReadAt: null,
      })
      .returning();

    // Artist B's last message: organizer has never read → unread.
    await db.insert(eventThreadMessages).values({
      threadId: threadB.id,
      authorProfileId: artistB.profile.id,
      body: "new question!",
      createdAt: new Date("2026-04-21T12:00:00Z"),
    });

    const rows = await getThreadsForOrganizer(event.id);
    expect(rows).toHaveLength(2);
    // Threads sorted by lastMessageAt desc.
    expect(rows[0].thread.id).toBe(threadB.id);
    expect(rows[1].thread.id).toBe(threadA.id);
    expect(rows[0].unreadForOrganizer).toBe(true);
    expect(rows[1].unreadForOrganizer).toBe(false);
    expect(rows[0].artistDisplayName).toBe("Artist B");
    expect(rows[0].lastMessagePreview).toContain("new question");

    // Organizer flags as read: repeat call should flip unread off.
    await db
      .update(eventThreads)
      .set({ organizerLastReadAt: new Date() })
      .where(eq(eventThreads.id, threadB.id));

    const rows2 = await getThreadsForOrganizer(event.id);
    expect(rows2[0].unreadForOrganizer).toBe(false);

    // Avoid unused-import lint.
    void organizer;
  });

  it("getThreadByIdForOrganizer filters by event to prevent cross-event access", async () => {
    const { convention } = await createTestOrganizer();
    const eventA = await createTestEvent(convention.id);
    const eventB = await createTestEvent(convention.id);
    const artist = await createTestArtist();

    const [thread] = await db
      .insert(eventThreads)
      .values({
        eventId: eventA.id,
        artistProfileId: artist.profile.id,
        lastMessageAt: new Date(),
      })
      .returning();

    // Queried with correct event: returns the thread.
    const hit = await getThreadByIdForOrganizer(eventA.id, thread.id);
    expect(hit).not.toBeNull();
    expect(hit!.artistDisplayName).toBeTruthy();

    // Queried with wrong event: returns null (important for auth).
    const miss = await getThreadByIdForOrganizer(eventB.id, thread.id);
    expect(miss).toBeNull();
  });
});

