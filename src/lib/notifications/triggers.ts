import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { applications } from "@/lib/db/schema/applications";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import { createNotifications } from "./service";

export async function notifyEventPublished(
  eventId: string,
  eventName: string,
  conventionId: string
): Promise<void> {
  // Get followers of this convention
  const followers = await db
    .select({ profileId: conventionFollows.profileId })
    .from(conventionFollows)
    .where(eq(conventionFollows.conventionId, conventionId));

  // Get artists who opted in to "any new event" notifications.
  // emailEnabled = true is the opt-in signal (it's the only toggle the UI exposes).
  const newEventSubscribers = await db
    .select({ profileId: notificationPreferences.profileId })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.notificationType, "new_event"),
        eq(notificationPreferences.emailEnabled, true)
      )
    );

  // Deduplicate: combine followers and new_event subscribers
  const followerIds = new Set(followers.map((f) => f.profileId));
  const allRecipientIds = new Set(followerIds);
  for (const sub of newEventSubscribers) {
    allRecipientIds.add(sub.profileId);
  }

  if (allRecipientIds.size === 0) return;

  const link = `/events/${eventId}`;

  const inputs = Array.from(allRecipientIds).map((profileId) => ({
    recipientProfileId: profileId,
    type: followerIds.has(profileId)
      ? ("event_published" as const)
      : ("new_event" as const),
    message: `New event: ${eventName}`,
    link,
  }));

  await createNotifications(inputs);
}

export async function notifyEventOpened(
  eventId: string,
  eventName: string,
  conventionId: string
): Promise<void> {
  // Notify only convention followers — any-new-event subscribers
  // were notified at publish time.
  const followers = await db
    .select({ profileId: conventionFollows.profileId })
    .from(conventionFollows)
    .where(eq(conventionFollows.conventionId, conventionId));

  if (followers.length === 0) return;

  const message = `Applications are now open for ${eventName}`;
  const link = `/events/${eventId}`;

  const inputs = followers.map((f) => ({
    recipientProfileId: f.profileId,
    type: "event_opened" as const,
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

export async function notifyThreadMessageFromArtist(
  organizerProfileId: string,
  artistProfileId: string,
  artistDisplayName: string,
  eventId: string,
  eventName: string
): Promise<void> {
  await createNotifications([
    {
      recipientProfileId: organizerProfileId,
      type: "thread_message_from_artist",
      message: `${artistDisplayName} sent you a question about ${eventName}`,
      link: `/conventions/manage/events/${eventId}#thread-${artistProfileId}`,
    },
  ]);
}

export async function notifyThreadMessageFromOrganizer(
  artistProfileId: string,
  eventId: string,
  eventName: string
): Promise<void> {
  await createNotifications([
    {
      recipientProfileId: artistProfileId,
      type: "thread_message_from_organizer",
      message: `The organizer replied to your question about ${eventName}`,
      link: `/events/${eventId}/messages`,
    },
  ]);
}
