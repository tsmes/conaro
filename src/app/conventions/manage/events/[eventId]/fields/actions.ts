"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FieldRequirements } from "@/lib/db/schema/events";
import { FIELD_REGISTRY } from "@/lib/db/field-registry";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { fieldConfigSchema } from "@/lib/validations/convention";
import { getOrganizerEvent } from "@/lib/conventions/queries";

export async function updateFieldConfig(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  const raw: Record<string, string> = {};
  for (const field of FIELD_REGISTRY) {
    raw[field.key] = (formData.get(field.key) ?? "not_requested").toString();
  }
  raw.minPortfolioImages = (
    formData.get("minPortfolioImages") ?? "0"
  ).toString();

  const result = fieldConfigSchema.safeParse(raw);
  if (!result.success) {
    const flat = result.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(flat)) {
      if (val) fieldErrors[key] = val;
    }
    return { fieldErrors };
  }

  const validated = result.data;
  const minImages = Number(validated.minPortfolioImages) || 0;

  const validStates = new Set(["required", "optional", "not_requested"]);
  const fieldRequirements: FieldRequirements = {};
  for (const field of FIELD_REGISTRY) {
    const value = (validated as Record<string, unknown>)[field.key];
    const state = typeof value === "string" && validStates.has(value)
      ? value
      : "not_requested";
    fieldRequirements[field.key] = state as FieldRequirements[string];
  }

  try {
    await db
      .update(events)
      .set({
        fieldRequirements,
        minPortfolioImages: minImages,
        updatedAt: new Date(),
      })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to update field configuration. Please try again." };
  }

  revalidatePath(`/conventions/manage/events/${event.id}/fields`);
  revalidatePath(`/conventions/manage/events/${event.id}`);
  return { success: true };
}
