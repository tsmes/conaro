"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { eventAnnouncements } from "@/lib/db/schema/event-announcements";
import { notifications } from "@/lib/db/schema/notifications";
import {
  eventThreads,
  eventThreadMessages,
} from "@/lib/db/schema/event-threads";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { notifyThreadMessageFromOrganizer } from "@/lib/notifications/triggers";
import { type ActionState } from "@/lib/validations/auth";

const replySchema = z
  .object({
    threadId: z.string().min(1),
    body: z.string().trim().min(1, "Message is required").max(5000),
    alsoAsAnnouncement: z.boolean(),
    announcementSubject: z.string().trim().max(200).optional(),
  })
  .refine(
    (input) =>
      !input.alsoAsAnnouncement ||
      (input.announcementSubject && input.announcementSubject.length > 0),
    {
      path: ["announcementSubject"],
      message: "Subject is required when posting as an announcement",
    }
  );

// Batch-insert announcement notifications for every currently-accepted
// applicant on the event. Mirrors announcements/actions.ts exactly.
async function notifyAcceptedApplicantsOfAnnouncement(
  eventId: string,
  subject: string
): Promise<void> {
  const accepted = await db
    .select({ profileId: applications.profileId })
    .from(applications)
    .where(
      and(
        eq(applications.eventId, eventId),
        eq(applications.status, "accepted")
      )
    );
  if (accepted.length === 0) return;

  const link = `/events/${eventId}`;
  await db.insert(notifications).values(
    accepted.map((a) => ({
      recipientProfileId: a.profileId,
      type: "event_announcement" as const,
      message: `New announcement: ${subject}`,
      link,
    }))
  );
}

// Organizer replies in a Q&A thread. When alsoAsAnnouncement is on, the
// same body is additionally posted as an event_announcements row and the
// full accepted-applicant fan-out fires alongside the private reply.
export async function replyToThread(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }
  const organizerProfileId = session.user.profileId;

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return { error: "Event ID is required" };

  const parsed = replySchema.safeParse({
    threadId: formData.get("threadId")?.toString(),
    body: formData.get("body")?.toString() ?? "",
    alsoAsAnnouncement: formData.get("alsoAsAnnouncement") === "on",
    announcementSubject:
      formData.get("announcementSubject")?.toString() ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { threadId, body, alsoAsAnnouncement, announcementSubject } =
    parsed.data;

  // Event ownership check.
  const event = await getOrganizerEvent(organizerProfileId, eventId);
  if (!event) return { error: "Event not found" };

  const [thread] = await db
    .select()
    .from(eventThreads)
    .where(
      and(eq(eventThreads.id, threadId), eq(eventThreads.eventId, eventId))
    );
  if (!thread) return { error: "Thread not found" };

  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(eventThreadMessages).values({
        threadId: thread.id,
        authorProfileId: organizerProfileId,
        body,
      });
      await tx
        .update(eventThreads)
        .set({
          lastMessageAt: now,
          organizerLastReadAt: now,
          updatedAt: now,
        })
        .where(eq(eventThreads.id, thread.id));

      if (alsoAsAnnouncement && announcementSubject) {
        await tx.insert(eventAnnouncements).values({
          eventId,
          authorProfileId: organizerProfileId,
          subject: announcementSubject,
          body,
        });
      }
    });
  } catch (error) {
    console.error("Failed to insert thread reply:", error);
    return { error: "Failed to send reply. Please try again." };
  }

  // Private reply → notify the artist this thread belongs to.
  try {
    await notifyThreadMessageFromOrganizer(
      thread.artistProfileId,
      eventId,
      event.name
    );
  } catch (error) {
    console.error("Failed to notify artist of reply:", error);
  }

  // Also-as-announcement → fan-out to every accepted artist.
  if (alsoAsAnnouncement && announcementSubject) {
    try {
      await notifyAcceptedApplicantsOfAnnouncement(eventId, announcementSubject);
    } catch (error) {
      console.error("Failed to notify applicants of announcement:", error);
    }
  }

  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

const markReadSchema = z.object({
  threadId: z.string().min(1),
  eventId: z.string().min(1),
});

// Organizer stamps their own last-read timestamp on a thread. Only works
// on threads that belong to an event they own.
export async function markThreadReadAsOrganizer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }
  const organizerProfileId = session.user.profileId;

  const parsed = markReadSchema.safeParse({
    threadId: formData.get("threadId")?.toString(),
    eventId: formData.get("eventId")?.toString(),
  });
  if (!parsed.success) return { error: "Thread ID and Event ID are required" };

  const { threadId, eventId } = parsed.data;

  // Ownership check via the existing helper.
  const owned = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, eventId));
  if (!owned.length) return { error: "Event not found" };

  const event = await getOrganizerEvent(organizerProfileId, eventId);
  if (!event) return { error: "Event not found" };

  const updated = await db
    .update(eventThreads)
    .set({ organizerLastReadAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(eventThreads.id, threadId), eq(eventThreads.eventId, eventId))
    )
    .returning({ id: eventThreads.id });

  if (updated.length === 0) return { error: "Thread not found" };

  revalidatePath(`/conventions/manage/events/${eventId}`);
  return { success: true };
}
