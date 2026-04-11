"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profiles } from "@/lib/db/schema/profiles";
import { conventions } from "@/lib/db/schema/conventions";
import { hashPassword } from "@/lib/auth/helpers";
import { signIn } from "@/lib/auth";
import { organizerRegistrationSchema } from "@/lib/validations/auth";

interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function registerOrganizer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    displayName: formData.get("displayName") as string,
    conventionName: formData.get("conventionName") as string,
  };

  const result = organizerRegistrationSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { email, password, displayName, conventionName } = result.data;

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await hashPassword(password);

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        name: displayName,
        password: hashedPassword,
      })
      .returning();

    const [profile] = await tx
      .insert(profiles)
      .values({
        userId: user.id,
        role: "organizer",
        displayName,
      })
      .returning();

    await tx.insert(conventions).values({
      organizerId: profile.id,
      name: conventionName,
    });
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/conventions",
  });

  redirect("/conventions");
}
