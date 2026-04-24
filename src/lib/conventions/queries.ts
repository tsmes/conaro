import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import type {
  ApplicationAnswers,
  ProfileSnapshot,
} from "@/lib/db/schema/applications";
import {
  FIELD_REGISTRY,
  type FieldKey,
} from "@/lib/db/field-registry";
import type { FieldRequirements } from "@/lib/db/schema/events";

export interface SelectionApplicant {
  id: string;
  profileId: string;
  status: (typeof applications.$inferSelect)["status"];
  pinned: boolean;
  paymentConfirmed: boolean;
  isBlockListed: boolean;
  createdAt: Date;
  snapshot: ProfileSnapshot;
  answers: ApplicationAnswers;
  guidelinesAcknowledgedAt: Date | null;
}

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

export async function getEventApplicants(
  profileId: string,
  eventId: string
): Promise<SelectionApplicant[]> {
  const convention = await getOrganizerConvention(profileId);
  if (!convention) return [];

  const rows = await db
    .select({
      id: applications.id,
      profileId: applications.profileId,
      status: applications.status,
      pinned: applications.pinned,
      paymentConfirmed: applications.paymentConfirmed,
      isBlockListed: applications.isBlockListed,
      createdAt: applications.createdAt,
      snapshot: applications.profileSnapshot,
      answers: applications.answers,
      guidelinesAcknowledgedAt: applications.guidelinesAcknowledgedAt,
    })
    .from(applications)
    .innerJoin(events, eq(events.id, applications.eventId))
    .where(
      and(
        eq(applications.eventId, eventId),
        eq(events.conventionId, convention.id)
      )
    )
    .orderBy(asc(applications.createdAt));

  return rows.map((row) => ({
    ...row,
    snapshot: normalizeSnapshot(row.snapshot),
    answers: row.answers ?? {},
  }));
}

function normalizeSnapshot(snapshot: ProfileSnapshot): ProfileSnapshot {
  return {
    ...snapshot,
    genres: snapshot.genres ?? [],
    mediums: snapshot.mediums ?? [],
    // Historic snapshots predate the `caption` field — on read they arrive
    // as `undefined`, but the SnapshotImage contract declares it required
    // (`string | null`). Normalise here so every downstream consumer sees
    // the invariant.
    images: (snapshot.images ?? []).map((image) => ({
      ...image,
      caption: image.caption ?? null,
    })),
  };
}

// Returns the event with the nearest upcoming or ongoing
// `eventStartDate` for a convention, or null when there is none.
// "Ongoing or upcoming" = start date is today or in the future — past
// events are never featured on the organizer dashboard.
export async function getCurrentEventForConvention(conventionId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.conventionId, conventionId),
        gte(events.eventStartDate, sql`current_date`)
      )
    )
    .orderBy(asc(events.eventStartDate))
    .limit(1);
  return event ?? null;
}

// Counts applications for an event grouped by status, returning the
// specific buckets the organizer dashboard needs. One DB round-trip.
export interface ApplicationCounts {
  total: number;
  accepted: number;
}

export async function getApplicationCounts(
  eventId: string
): Promise<ApplicationCounts> {
  const rows = await db
    .select({ status: applications.status, value: count() })
    .from(applications)
    .where(eq(applications.eventId, eventId))
    .groupBy(applications.status);
  let total = 0;
  let accepted = 0;
  for (const row of rows) {
    total += row.value;
    if (row.status === "accepted") accepted = row.value;
  }
  return { total, accepted };
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
