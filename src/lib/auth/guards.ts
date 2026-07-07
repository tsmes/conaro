import { auth } from "@/lib/auth";

type Role = "artist" | "organizer";

export interface GuardedSession {
  profileId: string;
  role: Role;
}

export type GuardResult = GuardedSession | { error: string };

// Standard "unauthorized" shape shared by server actions (ActionState) and
// the guards. Callers do `if ("error" in guard) return guard;`.
const UNAUTHORIZED = { error: "Unauthorized" } as const;

/**
 * Require an authenticated user with a profile, regardless of role. Returns
 * the profileId and role, or an error shape suitable for returning directly
 * from a server action.
 */
export async function requireProfile(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user?.profileId || !session.user.role) {
    return UNAUTHORIZED;
  }
  return { profileId: session.user.profileId, role: session.user.role };
}

/** Require an authenticated organizer. */
export async function requireOrganizer(): Promise<GuardResult> {
  const guard = await requireProfile();
  if ("error" in guard) return guard;
  if (guard.role !== "organizer") return UNAUTHORIZED;
  return guard;
}

/** Require an authenticated artist. */
export async function requireArtist(): Promise<GuardResult> {
  const guard = await requireProfile();
  if ("error" in guard) return guard;
  if (guard.role !== "artist") return UNAUTHORIZED;
  return guard;
}
