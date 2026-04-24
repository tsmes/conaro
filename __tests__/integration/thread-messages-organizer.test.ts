import { describe, it, expect, beforeEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
  createTestApplication,
  buildFormData,
  findNotificationsByProfileId,
} from "../helpers/db";
import {
  replyToThread,
  markThreadReadAsOrganizer,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/thread-actions";
import { db } from "@/lib/db";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import { eventAnnouncements } from "@/lib/db/schema/event-announcements";
import { applications } from "@/lib/db/schema/applications";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

async function organizerSetupWithThread() {
  const { profile: organizer, convention } = await createTestOrganizer();
  const event = await createTestEvent(convention.id, {
    status: "results_published",
  });
  const artist = await createTestArtist();
  const application = await createTestApplication(event.id, artist.profile.id);
  await db
    .update(applications)
    .set({ status: "accepted" })
    .where(eq(applications.id, application.id));

  // Artist has opened the thread with a question.
  const [thread] = await db
    .insert(eventThreads)
    .values({
      eventId: event.id,
      artistProfileId: artist.profile.id,
      lastMessageAt: new Date(),
    })
    .returning();
  await db.insert(eventThreadMessages).values({
    threadId: thread.id,
    authorProfileId: artist.profile.id,
    body: "When is move-in?",
  });

  return { organizer, convention, event, artist, thread };
}

describe("replyToThread (organizer)", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("posts the reply + notifies the artist", async () => {
    const { organizer, event, artist, thread } = await organizerSetupWithThread();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: organizer.id },
    });

    const result = await replyToThread(
      {},
      buildFormData({
        eventId: event.id,
        threadId: thread.id,
        body: "Move-in is at 07:00",
      })
    );
    expect(result.success).toBe(true);

    const messages = await db
      .select()
      .from(eventThreadMessages)
      .where(eq(eventThreadMessages.threadId, thread.id));
    expect(messages).toHaveLength(2);
    expect(messages[1].body).toBe("Move-in is at 07:00");
    expect(messages[1].authorProfileId).toBe(organizer.id);

    const artistNotifs = await findNotificationsByProfileId(artist.profile.id);
    expect(artistNotifs).toHaveLength(1);
    expect(artistNotifs[0].type).toBe("thread_message_from_organizer");

    // No announcement was created.
    const announcements = await db
      .select()
      .from(eventAnnouncements)
      .where(eq(eventAnnouncements.eventId, event.id));
    expect(announcements).toHaveLength(0);
  });

  it("also-as-announcement creates an event_announcements row + notifies accepted applicants", async () => {
    const { organizer, event, artist, thread } = await organizerSetupWithThread();

    // Second accepted artist to receive the announcement broadcast.
    const otherArtist = await createTestArtist("other@test.com", "Other");
    const otherApp = await createTestApplication(event.id, otherArtist.profile.id);
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, otherApp.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: organizer.id },
    });

    const result = await replyToThread(
      {},
      buildFormData({
        eventId: event.id,
        threadId: thread.id,
        body: "Move-in is at 07:00 for everyone",
        alsoAsAnnouncement: "on",
        announcementSubject: "Move-in time confirmed",
      })
    );
    expect(result.success).toBe(true);

    const announcements = await db
      .select()
      .from(eventAnnouncements)
      .where(eq(eventAnnouncements.eventId, event.id));
    expect(announcements).toHaveLength(1);
    expect(announcements[0].subject).toBe("Move-in time confirmed");
    expect(announcements[0].body).toBe("Move-in is at 07:00 for everyone");

    // Original asker gets the thread-reply notification.
    const asker = await findNotificationsByProfileId(artist.profile.id);
    expect(asker.some((n) => n.type === "thread_message_from_organizer")).toBe(
      true
    );
    // Other accepted artist gets the announcement fan-out.
    const other = await findNotificationsByProfileId(otherArtist.profile.id);
    expect(other.some((n) => n.type === "event_announcement")).toBe(true);
  });

  it("rejects alsoAsAnnouncement when subject is missing", async () => {
    const { organizer, event, thread } = await organizerSetupWithThread();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: organizer.id },
    });

    const result = await replyToThread(
      {},
      buildFormData({
        eventId: event.id,
        threadId: thread.id,
        body: "hello",
        alsoAsAnnouncement: "on",
      })
    );
    expect(result.fieldErrors?.announcementSubject).toBeDefined();
  });

  it("rejects non-owner organizer", async () => {
    const { event, thread } = await organizerSetupWithThread();
    const other = await createTestOrganizer("other-org@test.com", "Other Con");
    mockAuth.mockResolvedValue({
      user: { id: "u2", role: "organizer", profileId: other.profile.id },
    });

    const result = await replyToThread(
      {},
      buildFormData({
        eventId: event.id,
        threadId: thread.id,
        body: "tryin to sneak in",
      })
    );
    expect(result.error).toBe("Event not found");
  });

  it("rejects non-organizer role", async () => {
    const { event, thread } = await organizerSetupWithThread();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: "pid" },
    });

    const result = await replyToThread(
      {},
      buildFormData({
        eventId: event.id,
        threadId: thread.id,
        body: "nope",
      })
    );
    expect(result.error).toBe("Unauthorized");
  });
});

describe("markThreadReadAsOrganizer", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("stamps organizerLastReadAt for the organizer's own event", async () => {
    const { organizer, event, thread } = await organizerSetupWithThread();

    // Confirm initial state is null.
    const [before] = await db
      .select()
      .from(eventThreads)
      .where(eq(eventThreads.id, thread.id));
    expect(before.organizerLastReadAt).toBeNull();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: organizer.id },
    });

    const result = await markThreadReadAsOrganizer(
      {},
      buildFormData({ threadId: thread.id, eventId: event.id })
    );
    expect(result.success).toBe(true);

    const [after] = await db
      .select()
      .from(eventThreads)
      .where(eq(eventThreads.id, thread.id));
    expect(after.organizerLastReadAt).not.toBeNull();
  });
});
