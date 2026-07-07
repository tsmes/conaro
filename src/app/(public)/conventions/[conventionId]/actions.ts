"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { requireArtist } from "@/lib/auth/guards";
import { type ActionState } from "@/lib/validations/auth";

export async function toggleFollow(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const guard = await requireArtist();
  if ("error" in guard) return guard;
  const { profileId } = guard;

  const conventionId = formData.get("conventionId")?.toString();
  if (!conventionId) {
    return { error: "Convention ID is required" };
  }

  const [convention] = await db
    .select({ id: conventions.id })
    .from(conventions)
    .where(eq(conventions.id, conventionId));

  if (!convention) {
    return { error: "Convention not found" };
  }

  // Check current follow state and toggle
  const [existing] = await db
    .select({ id: conventionFollows.id })
    .from(conventionFollows)
    .where(
      and(
        eq(conventionFollows.profileId, profileId),
        eq(conventionFollows.conventionId, conventionId)
      )
    );

  if (existing) {
    await db
      .delete(conventionFollows)
      .where(eq(conventionFollows.id, existing.id));
  } else {
    await db
      .insert(conventionFollows)
      .values({ profileId, conventionId })
      .onConflictDoNothing();
  }

  revalidatePath(`/conventions/${conventionId}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}
