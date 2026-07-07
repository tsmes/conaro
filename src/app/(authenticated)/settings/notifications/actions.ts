"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import { requireProfile } from "@/lib/auth/guards";
import { type ActionState } from "@/lib/validations/auth";

const ARTIST_TYPES = [
  "event_published",
  "event_opened",
  "new_event",
  "results_published",
  "application_revoked",
  "thread_message_from_organizer",
] as const;

const ORGANIZER_TYPES = [
  "new_application",
  "thread_message_from_artist",
] as const;

export async function updateNotificationPreferences(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const guard = await requireProfile();
  if ("error" in guard) return guard;
  const { profileId, role } = guard;

  const types = role === "artist" ? ARTIST_TYPES : ORGANIZER_TYPES;

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
