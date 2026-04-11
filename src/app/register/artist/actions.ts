"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profiles } from "@/lib/db/schema/profiles";
import { hashPassword } from "@/lib/auth/helpers";
import { signIn } from "@/lib/auth";
import { artistRegistrationSchema } from "@/lib/validations/auth";

interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function registerArtist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    displayName: formData.get("displayName") as string,
  };

  const result = artistRegistrationSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { email, password, displayName } = result.data;

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

    await tx.insert(profiles).values({
      userId: user.id,
      role: "artist",
      displayName,
    });
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });

  redirect("/dashboard");
}
