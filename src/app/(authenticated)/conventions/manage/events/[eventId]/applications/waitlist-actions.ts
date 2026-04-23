"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { conventions } from "@/lib/db/schema/conventions";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";

// Organizer-side post-publish transitions. Unlike setApplicationDecision
// these are allowed once results are published so the organizer can
// reshape the accepted roster using the waitlist.

async function ensureWaitlistEnabled(
  profileId: string,
  eventId: string
): Promise<string | null> {
  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) return "Event not found";
  const [convention] = await db
    .select({ waitlistEnabled: conventions.waitlistEnabled })
    .from(conventions)
    .where(eq(conventions.id, event.conventionId));
  if (!convention?.waitlistEnabled) {
    return "Waitlist is not enabled for this convention";
  }
  return null;
}

async function updateApplicationStatus(
  formData: FormData,
  nextStatus: "accepted" | "waitlisted" | "rejected"
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const applicationId = formData.get("applicationId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  if (!applicationId || !eventId) {
    return { error: "Application and event id are required" };
  }

  const err = await ensureWaitlistEnabled(session.user.profileId, eventId);
  if (err) return { error: err };

  const result = await db
    .update(applications)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.eventId, eventId)
      )
    )
    .returning({ id: applications.id });

  if (result.length === 0) {
    return { error: "Application not found" };
  }

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function promoteFromWaitlist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return updateApplicationStatus(formData, "accepted");
}

export async function demoteToWaitlist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return updateApplicationStatus(formData, "waitlisted");
}

export async function removeFromWaitlist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return updateApplicationStatus(formData, "rejected");
}
