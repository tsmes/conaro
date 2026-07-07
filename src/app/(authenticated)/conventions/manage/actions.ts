"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { requireOrganizer } from "@/lib/auth/guards";
import { type ActionState } from "@/lib/validations/auth";
import { conventionProfileSchema } from "@/lib/validations/convention";
import { getOrganizerConvention } from "@/lib/conventions/queries";

export async function updateConventionProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const guard = await requireOrganizer();
  if ("error" in guard) return guard;
  const { profileId } = guard;

  const raw = {
    name: (formData.get("name") ?? "").toString(),
    description: (formData.get("description") ?? "").toString(),
    websiteUrl: (formData.get("websiteUrl") ?? "").toString(),
    guidelines: (formData.get("guidelines") ?? "").toString(),
    acceptanceMessage: (formData.get("acceptanceMessage") ?? "").toString(),
    rejectionMessage: (formData.get("rejectionMessage") ?? "").toString(),
    waitlistEnabled: (formData.get("waitlistEnabled") ?? "").toString(),
  };

  const result = conventionProfileSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const convention = await getOrganizerConvention(profileId);
  if (!convention) {
    return { error: "Convention not found" };
  }

  const {
    name,
    description,
    websiteUrl,
    guidelines,
    acceptanceMessage,
    rejectionMessage,
    waitlistEnabled,
  } = result.data;

  try {
    await db
      .update(conventions)
      .set({
        name,
        description: description || null,
        websiteUrl: websiteUrl || null,
        guidelines: guidelines || null,
        acceptanceMessage: acceptanceMessage || null,
        rejectionMessage: rejectionMessage || null,
        waitlistEnabled,
        updatedAt: new Date(),
      })
      .where(eq(conventions.id, convention.id));
  } catch {
    return { error: "Failed to update convention. Please try again." };
  }

  revalidatePath("/conventions/manage");
  revalidatePath("/conventions/manage/edit");
  revalidatePath("/conventions");
  return { success: true };
}
