"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { eventAnnouncements } from "@/lib/db/schema/event-announcements";
import { notifications } from "@/lib/db/schema/notifications";
import { type ActionState } from "@/lib/validations/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";

const announcementSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject is too long"),
  body: z
    .string()
    .min(1, "Body is required")
    .max(10_000, "Body is too long"),
});

async function ensureOrganizerEvent(profileId: string, eventId: string) {
  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  return event;
}

// Insert a notification row for every currently-accepted applicant so the
// announcement lights up their bell.
async function notifyAcceptedApplicants(
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

export async function createEventAnnouncement(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return { error: "Event ID is required" };

  const raw = {
    subject: (formData.get("subject") ?? "").toString().trim(),
    body: (formData.get("body") ?? "").toString().trim(),
  };
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await ensureOrganizerEvent(session.user.profileId, eventId);
  } catch {
    return { error: "Event not found" };
  }

  await db.insert(eventAnnouncements).values({
    eventId,
    authorProfileId: session.user.profileId,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });

  await notifyAcceptedApplicants(eventId, parsed.data.subject);

  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function updateEventAnnouncement(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const announcementId = formData.get("announcementId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!announcementId || !eventId) {
    return { error: "Announcement and event id are required" };
  }

  const raw = {
    subject: (formData.get("subject") ?? "").toString().trim(),
    body: (formData.get("body") ?? "").toString().trim(),
  };
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await ensureOrganizerEvent(session.user.profileId, eventId);
  } catch {
    return { error: "Event not found" };
  }

  const result = await db
    .update(eventAnnouncements)
    .set({
      subject: parsed.data.subject,
      body: parsed.data.body,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(eventAnnouncements.id, announcementId),
        eq(eventAnnouncements.eventId, eventId)
      )
    )
    .returning({ id: eventAnnouncements.id });

  if (result.length === 0) {
    return { error: "Announcement not found" };
  }

  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function deleteEventAnnouncement(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const announcementId = formData.get("announcementId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!announcementId || !eventId) {
    return { error: "Announcement and event id are required" };
  }

  try {
    await ensureOrganizerEvent(session.user.profileId, eventId);
  } catch {
    return { error: "Event not found" };
  }

  const deleted = await db
    .delete(eventAnnouncements)
    .where(
      and(
        eq(eventAnnouncements.id, announcementId),
        eq(eventAnnouncements.eventId, eventId)
      )
    )
    .returning({ id: eventAnnouncements.id });

  if (deleted.length === 0) {
    return { error: "Announcement not found" };
  }

  // Remove any unread notifications pointing at this event that match the
  // same link; we can't reliably identify the exact notification row for
  // the deleted announcement, so we leave historical rows in place.
  // (Cleanup would require a per-announcement notification pointer.)
  void inArray;

  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function getEventAnnouncements(
  eventId: string
): Promise<
  {
    id: string;
    subject: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
  }[]
> {
  return db
    .select({
      id: eventAnnouncements.id,
      subject: eventAnnouncements.subject,
      body: eventAnnouncements.body,
      createdAt: eventAnnouncements.createdAt,
      updatedAt: eventAnnouncements.updatedAt,
    })
    .from(eventAnnouncements)
    .where(eq(eventAnnouncements.eventId, eventId))
    .orderBy(desc(eventAnnouncements.createdAt));
}
