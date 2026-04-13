"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { profiles } from "@/lib/db/schema/profiles";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { getOrganizerConvention } from "@/lib/conventions/queries";

export async function addToList(
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

  const convention = await getOrganizerConvention(profileId);
  if (!convention) {
    return { error: "Convention not found" };
  }

  const artistProfileId = formData.get("profileId")?.toString();
  const listType = formData.get("listType")?.toString();

  if (!artistProfileId) {
    return { error: "Artist profile ID is required" };
  }

  if (listType !== "allow" && listType !== "block") {
    return { error: "Invalid list type" };
  }

  // Verify the profile belongs to an artist
  const [artistProfile] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(and(eq(profiles.id, artistProfileId), eq(profiles.role, "artist")));

  if (!artistProfile) {
    return { error: "Artist not found" };
  }

  try {
    await db
      .insert(conventionArtistLists)
      .values({
        conventionId: convention.id,
        profileId: artistProfileId,
        listType,
      })
      .onConflictDoUpdate({
        target: [
          conventionArtistLists.conventionId,
          conventionArtistLists.profileId,
        ],
        set: { listType },
      });
  } catch {
    return { error: "Failed to add artist to list. Please try again." };
  }

  revalidatePath("/conventions/manage/lists");
  return { success: true };
}

export async function removeFromList(
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

  const convention = await getOrganizerConvention(profileId);
  if (!convention) {
    return { error: "Convention not found" };
  }

  const artistProfileId = formData.get("profileId")?.toString();
  if (!artistProfileId) {
    return { error: "Artist profile ID is required" };
  }

  try {
    await db
      .delete(conventionArtistLists)
      .where(
        and(
          eq(conventionArtistLists.conventionId, convention.id),
          eq(conventionArtistLists.profileId, artistProfileId)
        )
      );
  } catch {
    return { error: "Failed to remove artist from list. Please try again." };
  }

  revalidatePath("/conventions/manage/lists");
  return { success: true };
}
