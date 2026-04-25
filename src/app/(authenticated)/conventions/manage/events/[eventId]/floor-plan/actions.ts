"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { type ActionState } from "@/lib/validations/auth";

function revalidateAll(eventId: string): void {
  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/conventions/manage/events/${eventId}/floor-plan`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/floor-plan`);
}

async function authorize(
  formData: FormData
): Promise<{ event: { id: string; status: string } } | { error: string }> {
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
  return { event: { id: event.id, status: event.status } };
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
    await db
      .update(events)
      .set({ floorPlanPublishedAt: new Date(), updatedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to publish floor plan. Please try again." };
  }

  revalidateAll(event.id);
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

  revalidateAll(event.id);
  return { success: true };
}

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
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return {
        fieldErrors: {
          daysBefore: ["Enter a positive whole number, or leave blank to disable."],
        },
      };
    }
    daysBefore = parsed;
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

  revalidateAll(event.id);
  return { success: true };
}
