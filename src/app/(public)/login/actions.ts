"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { users } from "@/lib/db/schema/auth";
import { loginSchema, type ActionState } from "@/lib/validations/auth";

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: (formData.get("email") ?? "").toString(),
    password: (formData.get("password") ?? "").toString(),
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { error: "Invalid email or password" };
  }

  const password = result.data.password;
  const email = result.data.email.toLowerCase().trim();

  // Look up role before signIn to determine redirect target
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return { error: "Invalid email or password" };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, user.id),
  });

  const redirectTo =
    profile?.role === "organizer" ? "/conventions" : "/dashboard";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return {};
}
