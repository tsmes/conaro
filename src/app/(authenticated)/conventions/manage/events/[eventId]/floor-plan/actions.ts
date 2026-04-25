"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { type ActionState } from "@/lib/validations/auth";

function revalidateAll(eventId: string, conventionId: string): void {
  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/conventions/manage/events/${eventId}/floor-plan`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/floor-plan`);
  revalidatePath(`/conventions/${conventionId}`);
}

async function authorize(
  formData: FormData
): Promise<
  | { event: { id: string; status: string; conventionId: string } }
  | { error: string }
> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }
  const profileId = session.user.profileId;
  if (!profileId) return { error: "Profile not found" };

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return { error: "Event ID is required" };

  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) return { error: "Event not found" };
  return {
    event: {
      id: event.id,
      status: event.status,
      conventionId: event.conventionId,
    },
  };
}

export async function publishFloorPlan(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await authorize(formData);
  if ("error" in result) return result;
  const { event } = result;

  if (event.status !== "results_published") {
    return { error: "Results must be published before the floor plan." };
  }

  try {
    // Re-assert the precondition in the WHERE clause so a status
    // transition slipping in between read and write can't get a stale
    // publish through. Mirrors the cron's per-row guard.
    const updated = await db
      .update(events)
      .set({ floorPlanPublishedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(events.id, event.id), eq(events.status, "results_published"))
      )
      .returning({ id: events.id });
    if (updated.length === 0) {
      return {
        error:
          "The event status changed before the floor plan was published. Please try again.",
      };
    }
  } catch {
    return { error: "Failed to publish floor plan. Please try again." };
  }

  revalidateAll(event.id, event.conventionId);
  return { success: true };
}

export async function unpublishFloorPlan(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await authorize(formData);
  if ("error" in result) return result;
  const { event } = result;

  try {
    await db
      .update(events)
      .set({ floorPlanPublishedAt: null, updatedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to unpublish floor plan. Please try again." };
  }

  revalidateAll(event.id, event.conventionId);
  return { success: true };
}

// Plain decimal positive integers only — Number() would otherwise
// happily eat scientific notation ("1e3"), hex ("0x10"), and signed
// forms ("+7"). The auto-publish UI's number input doesn't surface
// those forms, but the action is the source of truth.
const POSITIVE_INTEGER_RE = /^[1-9]\d*$/;

export async function setFloorPlanAutoPublish(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await authorize(formData);
  if ("error" in result) return result;
  const { event } = result;

  const raw = formData.get("daysBefore")?.toString().trim() ?? "";
  let daysBefore: number | null = null;
  if (raw !== "") {
    if (!POSITIVE_INTEGER_RE.test(raw)) {
      return {
        fieldErrors: {
          daysBefore: ["Enter a positive whole number, or leave blank to disable."],
        },
      };
    }
    daysBefore = Number(raw);
  }

  try {
    await db
      .update(events)
      .set({
        floorPlanAutoPublishDaysBefore: daysBefore,
        updatedAt: new Date(),
      })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to update auto-publish. Please try again." };
  }

  revalidateAll(event.id, event.conventionId);
  return { success: true };
}
