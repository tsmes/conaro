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
  sendThreadMessage,
  markThreadReadAsArtist,
} from "@/app/(public)/events/[eventId]/thread-actions";
import { db } from "@/lib/db";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import { applications } from "@/lib/db/schema/applications";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

async function acceptedSetup() {
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
  return { organizer, convention, event, artist };
}

describe("sendThreadMessage (artist)", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("creates a thread and message on first send + notifies organizer", async () => {
    const { organizer, event, artist } = await acceptedSetup();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "When is move-in?" })
    );
    expect(result.success).toBe(true);

    const [thread] = await db
      .select()
      .from(eventThreads)
      .where(
        and(
          eq(eventThreads.eventId, event.id),
          eq(eventThreads.artistProfileId, artist.profile.id)
        )
      );
    expect(thread).toBeDefined();

    const messages = await db
      .select()
      .from(eventThreadMessages)
      .where(eq(eventThreadMessages.threadId, thread.id));
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe("When is move-in?");
    expect(messages[0].authorProfileId).toBe(artist.profile.id);

    const orgNotifs = await findNotificationsByProfileId(organizer.id);
    expect(orgNotifs).toHaveLength(1);
    expect(orgNotifs[0].type).toBe("thread_message_from_artist");
  });

  it("second message reuses the same thread row (upsert)", async () => {
    const { event, artist } = await acceptedSetup();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "First question" })
    );
    await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "Follow-up" })
    );

    const threads = await db
      .select()
      .from(eventThreads)
      .where(
        and(
          eq(eventThreads.eventId, event.id),
          eq(eventThreads.artistProfileId, artist.profile.id)
        )
      );
    expect(threads).toHaveLength(1);

    const messages = await db
      .select()
      .from(eventThreadMessages)
      .where(eq(eventThreadMessages.threadId, threads[0].id));
    expect(messages).toHaveLength(2);
  });

  it("rejects waitlisted artist", async () => {
    const { event, artist } = await acceptedSetup();
    await db
      .update(applications)
      .set({ status: "waitlisted" })
      .where(eq(applications.profileId, artist.profile.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "hey" })
    );
    expect(result.error).toContain("Only accepted artists");
  });

  it("rejects rejected artist", async () => {
    const { event, artist } = await acceptedSetup();
    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.profileId, artist.profile.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "hey" })
    );
    expect(result.error).toContain("Only accepted artists");
  });

  it("rejects empty body", async () => {
    const { event, artist } = await acceptedSetup();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "   " })
    );
    expect(result.fieldErrors?.body).toBeDefined();
  });

  it("rejects non-artist role", async () => {
    const { event } = await acceptedSetup();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: "whatever" },
    });

    const result = await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "hey" })
    );
    expect(result.error).toBe("Unauthorized");
  });
});

describe("markThreadReadAsArtist", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("sets artistLastReadAt to now for the artist's own thread", async () => {
    const { event, artist } = await acceptedSetup();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "hey" })
    );

    const [before] = await db
      .select()
      .from(eventThreads)
      .where(eq(eventThreads.eventId, event.id));

    // Clear artistLastReadAt to simulate unread state.
    await db
      .update(eventThreads)
      .set({ artistLastReadAt: null })
      .where(eq(eventThreads.id, before.id));

    const result = await markThreadReadAsArtist(
      {},
      buildFormData({ threadId: before.id })
    );
    expect(result.success).toBe(true);

    const [after] = await db
      .select()
      .from(eventThreads)
      .where(eq(eventThreads.id, before.id));
    expect(after.artistLastReadAt).not.toBeNull();
  });

  it("refuses to mark another artist's thread", async () => {
    const { event, artist } = await acceptedSetup();
    const otherArtist = await createTestArtist("other@test.com", "Other");

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });
    await sendThreadMessage(
      {},
      buildFormData({ eventId: event.id, body: "hey" })
    );
    const [thread] = await db
      .select()
      .from(eventThreads)
      .where(eq(eventThreads.eventId, event.id));

    // Switch to the other artist and try to read the first artist's thread.
    mockAuth.mockResolvedValue({
      user: { id: "u2", role: "artist", profileId: otherArtist.profile.id },
    });
    const result = await markThreadReadAsArtist(
      {},
      buildFormData({ threadId: thread.id })
    );
    expect(result.error).toBe("Thread not found");
  });
});
