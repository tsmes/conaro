import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { applications } from "@/lib/db/schema/applications";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import { createNotifications } from "./service";

export async function notifyEventOpened(
  eventId: string,
  eventName: string,
  conventionId: string
): Promise<void> {
  // Get followers of this convention
  const followers = await db
    .select({ profileId: conventionFollows.profileId })
    .from(conventionFollows)
    .where(eq(conventionFollows.conventionId, conventionId));

  // Get artists with "any new event" email preference enabled
  // (these also get an in-app notification)
  const newEventSubscribers = await db
    .select({ profileId: notificationPreferences.profileId })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.notificationType, "new_event"));

  // Deduplicate: combine followers and new_event subscribers
  const followerIds = new Set(followers.map((f) => f.profileId));
  const allRecipientIds = new Set(followerIds);
  for (const sub of newEventSubscribers) {
    allRecipientIds.add(sub.profileId);
  }

  if (allRecipientIds.size === 0) return;

  const message = `Applications are now open for ${eventName}`;
  const link = `/events/${eventId}`;

  const inputs = Array.from(allRecipientIds).map((profileId) => ({
    recipientProfileId: profileId,
    type: followerIds.has(profileId)
      ? ("event_opened" as const)
      : ("new_event" as const),
    message,
    link,
  }));

  await createNotifications(inputs);
}

export async function notifyResultsPublished(
  eventId: string,
  eventName: string
): Promise<void> {
  const applicants = await db
    .select({ profileId: applications.profileId })
    .from(applications)
    .where(eq(applications.eventId, eventId));

  if (applicants.length === 0) return;

  const inputs = applicants.map((a) => ({
    recipientProfileId: a.profileId,
    type: "results_published" as const,
    message: `Results have been published for ${eventName}`,
    link: "/dashboard",
  }));

  await createNotifications(inputs);
}

export async function notifyApplicationRevoked(
  artistProfileId: string,
  eventName: string
): Promise<void> {
  await createNotifications([
    {
      recipientProfileId: artistProfileId,
      type: "application_revoked",
      message: `Your application to ${eventName} has been revoked`,
      link: "/dashboard",
    },
  ]);
}

export async function notifyNewApplication(
  organizerProfileId: string,
  artistName: string,
  eventId: string,
  eventName: string
): Promise<void> {
  await createNotifications([
    {
      recipientProfileId: organizerProfileId,
      type: "new_application",
      message: `${artistName} applied to ${eventName}`,
      link: `/conventions/manage/events/${eventId}/applications`,
    },
  ]);
}
