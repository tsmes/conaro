"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";

const ARTIST_TYPES = [
  "event_opened",
  "new_event",
  "results_published",
  "application_revoked",
] as const;

const ORGANIZER_TYPES = ["new_application"] as const;

export async function updateNotificationPreferences(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || !session.user.role) {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  const types =
    session.user.role === "artist" ? ARTIST_TYPES : ORGANIZER_TYPES;

  try {
    for (const type of types) {
      const emailEnabled = formData.get(`email_${type}`) === "on";
      await db
        .insert(notificationPreferences)
        .values({
          profileId,
          notificationType: type,
          emailEnabled,
        })
        .onConflictDoUpdate({
          target: [
            notificationPreferences.profileId,
            notificationPreferences.notificationType,
          ],
          set: { emailEnabled },
        });
    }
  } catch {
    return { error: "Failed to save preferences. Please try again." };
  }

  revalidatePath("/settings/notifications");
  return { success: true };
}
