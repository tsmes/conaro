"use server";

import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profiles } from "@/lib/db/schema/profiles";
import { hashPassword } from "@/lib/auth/helpers";
import { signIn } from "@/lib/auth";
import {
  artistRegistrationSchema,
  type ActionState,
} from "@/lib/validations/auth";
import { isUniqueViolation } from "@/lib/db/errors";

export async function registerArtist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: (formData.get("email") ?? "").toString(),
    password: (formData.get("password") ?? "").toString(),
    confirmPassword: (formData.get("confirmPassword") ?? "").toString(),
    displayName: (formData.get("displayName") ?? "").toString(),
  };

  const result = artistRegistrationSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const { password, displayName } = result.data;
  const email = result.data.email.toLowerCase().trim();
  const hashedPassword = await hashPassword(password);

  try {
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
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return { error: "An account with this email already exists" };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created. Please log in." };
    }
    throw error;
  }

  return {};
}
