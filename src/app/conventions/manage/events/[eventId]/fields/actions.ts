"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type {
  FieldRequirementState,
  FieldRequirements,
} from "@/lib/db/schema/events";
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
    const fieldErrors = result.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return { fieldErrors };
  }

  const validated = result.data as Record<string, unknown>;
  const minImages = Number(validated.minPortfolioImages ?? 0);

  const fieldRequirements: FieldRequirements = {};
  for (const field of FIELD_REGISTRY) {
    fieldRequirements[field.key] = (validated[field.key] ??
      "not_requested") as FieldRequirementState;
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
