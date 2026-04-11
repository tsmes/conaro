"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { basicInfoSchema, logisticsSchema } from "@/lib/validations/profile";

export async function updateBasicInfo(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }

  const raw = {
    displayName: (formData.get("displayName") ?? "").toString(),
    realName: (formData.get("realName") ?? "").toString(),
    contactEmail: (formData.get("contactEmail") ?? "").toString(),
    phone: (formData.get("phone") ?? "").toString(),
    bio: (formData.get("bio") ?? "").toString(),
    websiteUrl: (formData.get("websiteUrl") ?? "").toString(),
    socialLinks: (formData.get("socialLinks") ?? "").toString(),
  };

  const result = basicInfoSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { displayName, realName, contactEmail, phone, bio, websiteUrl, socialLinks } =
    result.data;

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));

    await tx
      .update(artistProfiles)
      .set({
        realName: realName || null,
        contactEmail,
        phone: phone || null,
        bio: bio || null,
        websiteUrl: websiteUrl || null,
        socialLinks: socialLinks || null,
        updatedAt: new Date(),
      })
      .where(eq(artistProfiles.profileId, profileId));
  });

  return { success: true };
}

export async function updateLogistics(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }

  const raw = {
    helpers: (formData.get("helpers") ?? "0").toString(),
    accessibilityNeeds: (formData.get("accessibilityNeeds") ?? "").toString(),
    tableSizePreference: (formData.get("tableSizePreference") ?? "").toString(),
    notes: (formData.get("notes") ?? "").toString(),
  };

  const result = logisticsSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { helpers, accessibilityNeeds, tableSizePreference, notes } = result.data;

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  await db
    .update(artistProfiles)
    .set({
      helpers,
      accessibilityNeeds: accessibilityNeeds || null,
      tableSizePreference: tableSizePreference || null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(artistProfiles.profileId, profileId));

  return { success: true };
}
