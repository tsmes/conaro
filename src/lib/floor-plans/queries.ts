import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FloorPlan, FloorPlanTable } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { profiles } from "@/lib/db/schema/profiles";

export interface ResolvedAssignment {
  applicationId: string;
  artistDisplayName: string;
  // The size the artist picked at apply time (stored inside
  // applications.answers). Compared to the placed table's
  // tableSizeOptionId at view time to compute the mismatch badge.
  requestedTableSizeOptionId: string | null;
}

export interface ResolvedFloorPlanTable extends FloorPlanTable {
  assignment: ResolvedAssignment | null;
}

export interface ResolvedFloorPlan {
  rooms: FloorPlan["rooms"];
  tables: ResolvedFloorPlanTable[];
}

// Loads the stored plan and resolves every assignedApplicationId to
// the owning artist's displayName + the size they originally requested.
// One DB round-trip for the plan itself and one for assignment lookup.
// Assignments referencing an application that doesn't belong to this
// event or isn't accepted get silently dropped (defensive — save-side
// validation should already block that state).
export async function getFloorPlanForEvent(
  eventId: string
): Promise<ResolvedFloorPlan | null> {
  const [row] = await db
    .select({ floorPlan: events.floorPlan })
    .from(events)
    .where(eq(events.id, eventId));
  if (!row || !row.floorPlan) return null;
  const plan = row.floorPlan;

  const assignedIds = plan.tables
    .map((t) => t.assignedApplicationId)
    .filter((id): id is string => id !== null);

  const resolved = new Map<string, ResolvedAssignment>();
  if (assignedIds.length > 0) {
    const rows = await db
      .select({
        applicationId: applications.id,
        status: applications.status,
        answers: applications.answers,
        artistDisplayName: profiles.displayName,
      })
      .from(applications)
      .innerJoin(profiles, eq(profiles.id, applications.profileId))
      .where(
        and(
          inArray(applications.id, assignedIds),
          eq(applications.eventId, eventId)
        )
      );

    for (const r of rows) {
      if (r.status !== "accepted") continue;
      resolved.set(r.applicationId, {
        applicationId: r.applicationId,
        artistDisplayName: r.artistDisplayName,
        requestedTableSizeOptionId:
          (r.answers as { tableSizeOptionId?: string } | null)
            ?.tableSizeOptionId ?? null,
      });
    }
  }

  return {
    rooms: plan.rooms,
    tables: plan.tables.map((t) => ({
      ...t,
      assignment: t.assignedApplicationId
        ? resolved.get(t.assignedApplicationId) ?? null
        : null,
    })),
  };
}

export interface AcceptedArtistForPlanner {
  applicationId: string;
  displayName: string;
  requestedTableSizeOptionId: string | null;
}

// Every accepted artist on the event, shaped for the assign-artist
// dialog. Ordered by displayName so the list is stable between renders.
export async function getAcceptedArtistsForEvent(
  eventId: string
): Promise<AcceptedArtistForPlanner[]> {
  const rows = await db
    .select({
      applicationId: applications.id,
      displayName: profiles.displayName,
      answers: applications.answers,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.profileId))
    .where(
      and(
        eq(applications.eventId, eventId),
        eq(applications.status, "accepted")
      )
    );

  return rows
    .map((r) => ({
      applicationId: r.applicationId,
      displayName: r.displayName,
      requestedTableSizeOptionId:
        (r.answers as { tableSizeOptionId?: string } | null)
          ?.tableSizeOptionId ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
