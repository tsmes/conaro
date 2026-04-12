"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";

export async function followConvention(
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

  await db
    .insert(conventionFollows)
    .values({
      profileId: session.user.profileId,
      conventionId,
    })
    .onConflictDoNothing();

  revalidatePath(`/conventions/${conventionId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function unfollowConvention(
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

  await db
    .delete(conventionFollows)
    .where(
      and(
        eq(conventionFollows.profileId, session.user.profileId),
        eq(conventionFollows.conventionId, conventionId)
      )
    );

  revalidatePath(`/conventions/${conventionId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
