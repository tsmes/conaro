import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";
import {
  FIELD_REGISTRY,
  type FieldKey,
} from "@/lib/db/field-registry";
import type { FieldRequirements } from "@/lib/db/schema/events";

export async function getOrganizerConvention(profileId: string) {
  const [convention] = await db
    .select()
    .from(conventions)
    .where(eq(conventions.organizerId, profileId));
  return convention ?? null;
}

export async function getOrganizerEvent(
  profileId: string,
  eventId: string
) {
  const convention = await getOrganizerConvention(profileId);
  if (!convention) return null;

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.conventionId, convention.id)));
  return event ?? null;
}

export function buildDefaultFieldRequirements(): FieldRequirements {
  const requirements: FieldRequirements = {};
  for (const field of FIELD_REGISTRY) {
    requirements[field.key as FieldKey] = field.required
      ? "required"
      : "not_requested";
  }
  return requirements;
}
