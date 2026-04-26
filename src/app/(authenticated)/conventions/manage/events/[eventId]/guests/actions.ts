"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { Guest } from "@/lib/db/schema/events";
import { storage } from "@/lib/storage";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { type ActionState } from "@/lib/validations/auth";
import { guestsSchema } from "@/lib/validations/guests";

interface AuthorizedEvent {
  id: string;
  conventionId: string;
  guests: Guest[] | null;
}

async function authorize(
  formData: FormData
): Promise<{ event: AuthorizedEvent } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }
  const profileId = session.user.profileId;
  if (!profileId) return { error: "Profile not found" };
  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return { error: "Event ID is required" };
  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) return { error: "Event not found" };
  return {
    event: {
      id: event.id,
      conventionId: event.conventionId,
      guests: (event.guests as Guest[] | null) ?? null,
    },
  };
}

function revalidateAll(eventId: string, conventionId: string): void {
  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/conventions/manage/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/conventions/${conventionId}`);
}

// Only delete storage keys we know belong to this event's guests
// directory — defensive guard so a malicious payload can't wipe
// unrelated files via the orphan-cleanup path. Also rejects any
// path containing ".." so a key like "events/<id>/guests/../../x"
// can't escape the sandbox if the storage adapter doesn't already
// normalise.
function isEventGuestImagePath(eventId: string, path: string): boolean {
  if (path.includes("..")) return false;
  return path.startsWith(`events/${eventId}/guests/`);
}

export async function saveGuests(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await authorize(formData);
  if ("error" in result) return result;
  const { event } = result;

  const raw = formData.get("guests")?.toString() ?? "[]";
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Invalid guests data." };
  }

  const parsed = guestsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path
        .map((segment) =>
          typeof segment === "number" ? String(segment) : segment
        )
        .join(".");
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { fieldErrors };
  }

  const next = parsed.data.length === 0 ? null : parsed.data;

  // Diff old vs new image paths so a removed-or-replaced upload is
  // cleaned up from storage. Only paths under this event's guests
  // directory are candidates for deletion.
  const oldPaths = new Set(
    (event.guests ?? []).flatMap((g) => (g.imagePath ? [g.imagePath] : []))
  );
  const newPaths = new Set(
    (next ?? []).flatMap((g) => (g.imagePath ? [g.imagePath] : []))
  );
  const orphans = [...oldPaths].filter(
    (path) => !newPaths.has(path) && isEventGuestImagePath(event.id, path)
  );

  try {
    await db
      .update(events)
      .set({ guests: next, updatedAt: new Date() })
      // Re-assert convention ownership in the WHERE for
      // defence-in-depth — same pattern the floor-plan actions use.
      .where(
        and(
          eq(events.id, event.id),
          eq(events.conventionId, event.conventionId)
        )
      );
  } catch {
    return { error: "Failed to save guests. Please try again." };
  }

  // Best-effort cleanup; errors are not surfaced because the DB
  // write has already succeeded and a stale storage key is benign.
  // Run deletes in parallel so a long list of orphans doesn't
  // gate the response on N sequential round-trips.
  await Promise.all(
    orphans.map((path) => storage.delete(path).catch(() => {}))
  );

  revalidateAll(event.id, event.conventionId);
  return { success: true };
}
