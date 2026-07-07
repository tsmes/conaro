"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { unassignApplicationFromPlan } from "@/lib/floor-plans/assignments";

type EventRow = typeof events.$inferSelect;

// Organizer-side post-publish transitions. Unlike setApplicationDecision
// these are allowed once results are published so the organizer can
// reshape the accepted roster using the waitlist.

async function ensureWaitlistEnabled(
  profileId: string,
  eventId: string
): Promise<{ event: EventRow } | { error: string }> {
  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) return { error: "Event not found" };
  const [convention] = await db
    .select({ waitlistEnabled: conventions.waitlistEnabled })
    .from(conventions)
    .where(eq(conventions.id, event.conventionId));
  if (!convention?.waitlistEnabled) {
    return { error: "Waitlist is not enabled for this convention" };
  }
  return { event };
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

  const gate = await ensureWaitlistEnabled(session.user.profileId, eventId);
  if ("error" in gate) return { error: gate.error };
  const { event } = gate;

  // Demoting out of accepted (waitlisted/rejected) must also drop any
  // floor-plan seat, or the stored plan keeps a dead reference that later
  // blocks saveFloorPlan. Done in one transaction with the status change.
  const result = await db.transaction(async (tx) => {
    const updated = await tx
      .update(applications)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.eventId, eventId)
        )
      )
      .returning({ id: applications.id });

    if (updated.length > 0 && nextStatus !== "accepted" && event.floorPlan) {
      const { plan, changed } = unassignApplicationFromPlan(
        event.floorPlan,
        applicationId
      );
      if (changed) {
        await tx
          .update(events)
          .set({ floorPlan: plan, updatedAt: new Date() })
          .where(eq(events.id, eventId));
      }
    }

    return updated;
  });

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
