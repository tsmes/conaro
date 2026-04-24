"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { conventions } from "@/lib/db/schema/conventions";
import { profiles } from "@/lib/db/schema/profiles";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import { notifyThreadMessageFromArtist } from "@/lib/notifications/triggers";
import { type ActionState } from "@/lib/validations/auth";

const sendMessageSchema = z.object({
  eventId: z.string().min(1),
  body: z.string().trim().min(1, "Message is required").max(5000),
});

// Accepted artist posts a new message in their Q&A thread with the
// event's organizer. Upserts the thread row on first message.
export async function sendThreadMessage(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }
  const artistProfileId = session.user.profileId;

  const parsed = sendMessageSchema.safeParse({
    eventId: formData.get("eventId")?.toString(),
    body: formData.get("body")?.toString() ?? "",
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return { fieldErrors };
  }
  const { eventId, body } = parsed.data;

  // Must be accepted on this event.
  const [application] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(
      and(
        eq(applications.eventId, eventId),
        eq(applications.profileId, artistProfileId)
      )
    );
  if (!application || application.status !== "accepted") {
    return {
      error: "Only accepted artists can send messages about this event",
    };
  }

  // Load event + organizer profile for the notification payload.
  const [eventRow] = await db
    .select({
      id: events.id,
      name: events.name,
      conventionId: events.conventionId,
    })
    .from(events)
    .where(eq(events.id, eventId));
  if (!eventRow) return { error: "Event not found" };

  const [conventionRow] = await db
    .select({ organizerId: conventions.organizerId })
    .from(conventions)
    .where(eq(conventions.id, eventRow.conventionId));
  if (!conventionRow) return { error: "Convention not found" };

  const [artistRow] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, artistProfileId));

  const now = new Date();

  // Upsert the thread row and insert the message in a single transaction
  // so a post-upsert failure can't leave a thread with a bumped
  // lastMessageAt but no corresponding message.
  let threadId: string;
  try {
    threadId = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(eventThreads)
        .values({
          eventId,
          artistProfileId,
          lastMessageAt: now,
          // Artist is the author; they've implicitly "read" their own message.
          artistLastReadAt: now,
        })
        .onConflictDoUpdate({
          target: [eventThreads.eventId, eventThreads.artistProfileId],
          set: { lastMessageAt: now, artistLastReadAt: now, updatedAt: now },
        })
        .returning({ id: eventThreads.id });

      await tx.insert(eventThreadMessages).values({
        threadId: thread.id,
        authorProfileId: artistProfileId,
        body,
      });

      return thread.id;
    });
  } catch (error) {
    console.error("Failed to send thread message:", error);
    return { error: "Failed to send message. Please try again." };
  }
  void threadId;

  try {
    await notifyThreadMessageFromArtist(
      conventionRow.organizerId,
      artistProfileId,
      artistRow?.displayName ?? "An artist",
      eventId,
      eventRow.name
    );
  } catch (error) {
    console.error("Failed to notify organizer of thread message:", error);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/conventions/manage/events/${eventId}`);
  return { success: true };
}

const markReadSchema = z.object({
  threadId: z.string().min(1),
});

// Artist marks their thread as read — called from the artist-facing
// event page when they open the thread card.
export async function markThreadReadAsArtist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }
  const artistProfileId = session.user.profileId;

  const parsed = markReadSchema.safeParse({
    threadId: formData.get("threadId")?.toString(),
  });
  if (!parsed.success) return { error: "Thread ID is required" };

  const { threadId } = parsed.data;
  const updated = await db
    .update(eventThreads)
    .set({ artistLastReadAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(eventThreads.id, threadId),
        eq(eventThreads.artistProfileId, artistProfileId)
      )
    )
    .returning({ eventId: eventThreads.eventId });

  if (updated.length === 0) return { error: "Thread not found" };

  revalidatePath(`/events/${updated[0].eventId}`);
  return { success: true };
}
