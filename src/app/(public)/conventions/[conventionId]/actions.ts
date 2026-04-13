"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";

export async function toggleFollow(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }

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

  const profileId = session.user.profileId;

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
  return { success: true };
}
