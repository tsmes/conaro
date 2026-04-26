"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { type ActionState } from "@/lib/validations/auth";
import {
  isDateWithinEvent,
  programmeSchema,
} from "@/lib/validations/programme";

interface AuthorizedEvent {
  id: string;
  conventionId: string;
  eventStartDate: string;
  eventEndDate: string | null;
}

async function authorize(
  formData: FormData
): Promise<{ event: AuthorizedEvent } | { error: string }> {
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
      conventionId: event.conventionId,
      eventStartDate: event.eventStartDate,
      eventEndDate: event.eventEndDate,
    },
  };
}

function revalidateAll(eventId: string, conventionId: string): void {
  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/conventions/manage/events/${eventId}/programme`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/programme`);
  revalidatePath(`/conventions/${conventionId}`);
}

export async function saveProgramme(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await authorize(formData);
  if ("error" in result) return result;
  const { event } = result;

  const raw = formData.get("programme")?.toString() ?? "[]";
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Invalid programme data." };
  }

  const parsed = programmeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path
        .map((segment) =>
          typeof segment === "number" ? String(segment) : segment
        )
        .join(".");
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { fieldErrors };
  }

  // Cross-field check: every item's date must fall inside the event's
  // start/end window. Done after Zod so format errors surface first.
  const rangeErrors: Record<string, string[]> = {};
  parsed.data.forEach((item, index) => {
    if (
      !isDateWithinEvent(item.date, event.eventStartDate, event.eventEndDate)
    ) {
      rangeErrors[`${index}.date`] = ["Date must fall within the event."];
    }
  });
  if (Object.keys(rangeErrors).length > 0) {
    return { fieldErrors: rangeErrors };
  }

  const next = parsed.data.length === 0 ? null : parsed.data;

  try {
    await db
      .update(events)
      .set({ programme: next, updatedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to save programme. Please try again." };
  }

  revalidateAll(event.id, event.conventionId);
  return { success: true };
}
