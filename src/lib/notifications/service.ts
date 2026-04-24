import { and, eq, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notifications,
  notificationPreferences,
} from "@/lib/db/schema/notifications";
import { profiles } from "@/lib/db/schema/profiles";
import { users } from "@/lib/db/schema/auth";
import { emailAdapter } from "@/lib/email";

type NotificationType =
  | "event_published"
  | "event_opened"
  | "new_event"
  | "results_published"
  | "application_revoked"
  | "new_application"
  | "thread_message_from_artist"
  | "thread_message_from_organizer";

interface NotificationInput {
  recipientProfileId: string;
  type: NotificationType;
  message: string;
  link?: string;
}

export async function createNotifications(
  inputs: NotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;

  // Batch-insert in-app notifications
  await db.insert(notifications).values(
    inputs.map((input) => ({
      recipientProfileId: input.recipientProfileId,
      type: input.type,
      message: input.message,
      link: input.link ?? null,
    }))
  );

  // Check email preferences and send emails
  for (const input of inputs) {
    try {
      const emailEnabled = await getEmailPreference(
        input.recipientProfileId,
        input.type
      );
      if (!emailEnabled) continue;

      // Look up recipient email
      const [result] = await db
        .select({ email: users.email })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(eq(profiles.id, input.recipientProfileId));

      if (!result?.email) continue;

      await emailAdapter.sendEmail(
        result.email,
        formatSubject(input.type),
        input.message,
        input.link ?? ""
      );
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }
}

export async function getNotificationsForProfile(
  profileId: string,
  limit = 50
) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientProfileId, profileId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(profileId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientProfileId, profileId),
        eq(notifications.isRead, false)
      )
    );
  return value;
}

export async function markAsRead(
  notificationId: string,
  profileId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientProfileId, profileId)
      )
    );
}

export async function markAllAsRead(profileId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.recipientProfileId, profileId),
        eq(notifications.isRead, false)
      )
    );
}

export async function getEmailPreference(
  profileId: string,
  type: NotificationType
): Promise<boolean> {
  const [pref] = await db
    .select({ emailEnabled: notificationPreferences.emailEnabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.profileId, profileId),
        eq(notificationPreferences.notificationType, type)
      )
    );
  return pref?.emailEnabled ?? false;
}

function formatSubject(type: NotificationType): string {
  const subjects: Record<NotificationType, string> = {
    event_published: "A new event has been published",
    event_opened: "Applications are now open",
    new_event: "A new event is accepting applications",
    results_published: "Application results are in",
    application_revoked: "Your application status has changed",
    new_application: "New application received",
    thread_message_from_artist: "New message from an applicant",
    thread_message_from_organizer: "New message from the organizer",
  };
  return `Conaro: ${subjects[type]}`;
}
