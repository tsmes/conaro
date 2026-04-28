import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type {
  FloorPlan,
  FloorPlanLabel,
  FloorPlanTable,
} from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { storage } from "@/lib/storage";
import {
  parseSocialLinks,
  type SocialLink,
} from "@/lib/artist-profile/social-links";

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

// Reads a plan out of storage and backfills `roomId` on any legacy
// table that predates the room-scoping change. Tables without a valid
// roomId get pinned to the first room; if the plan has no rooms, such
// tables are dropped (they can't render anywhere meaningful). Rooms
// are passed through as-is, so any optional `vertices` polygon survives
// the migration unchanged.
function migrateLegacyPlan(stored: FloorPlan): FloorPlan {
  const roomIds = new Set(stored.rooms.map((r) => r.id));
  const fallbackRoomId = stored.rooms[0]?.id ?? null;
  const tables: FloorPlanTable[] = [];
  for (const t of stored.tables) {
    const hasValidRoom = t.roomId && roomIds.has(t.roomId);
    const rotationDeg =
      t.rotationDeg === 90 || t.rotationDeg === 180 || t.rotationDeg === 270
        ? t.rotationDeg
        : 0;
    if (hasValidRoom) {
      tables.push({ ...t, rotationDeg });
      continue;
    }
    if (!fallbackRoomId) continue;
    tables.push({ ...t, roomId: fallbackRoomId, rotationDeg });
  }
  // Labels are optional in storage — normalise to an array and drop
  // any that reference a missing room, mirroring the table rule.
  const labels: FloorPlanLabel[] = [];
  for (const l of stored.labels ?? []) {
    if (!roomIds.has(l.roomId)) continue;
    const rotationDeg =
      l.rotationDeg === 90 || l.rotationDeg === 180 || l.rotationDeg === 270
        ? l.rotationDeg
        : 0;
    labels.push({ ...l, rotationDeg });
  }
  return { rooms: stored.rooms, tables, labels };
}

export interface ResolvedFloorPlan {
  rooms: FloorPlan["rooms"];
  tables: ResolvedFloorPlanTable[];
  labels: FloorPlanLabel[];
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
  const plan = migrateLegacyPlan(row.floorPlan);

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
    labels: plan.labels ?? [],
  };
}

export interface AcceptedArtistForPlanner {
  applicationId: string;
  displayName: string;
  requestedTableSizeOptionId: string | null;
  /** Storage key (not URL) of the top-ranked portfolio image, or
   *  null if the artist has no portfolio. The Artists tab uses this
   *  for the card cover; the planner dialog and the marquee ignore
   *  it. Pulling it here avoids an extra round-trip on the artist
   *  list page. */
  coverImagePath: string | null;
}

// Every accepted artist on the event, shaped for the assign-artist
// dialog and the public Artists tab. Ordered by displayName so the
// list is stable between renders.
export async function getAcceptedArtistsForEvent(
  eventId: string
): Promise<AcceptedArtistForPlanner[]> {
  const rows = await db
    .select({
      applicationId: applications.id,
      profileId: applications.profileId,
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

  // Pull every portfolio image for the matched profiles in one
  // round-trip and pick the highest-ranked one per profile in JS.
  // Same section-priority rule as the floor-plan info card.
  const profileIds = rows.map((r) => r.profileId);
  const coverByProfile = new Map<string, string>();
  if (profileIds.length > 0) {
    const imageRows = await db
      .select({
        profileId: portfolioImages.profileId,
        storagePath: portfolioImages.storagePath,
        section: portfolioImages.section,
        sortOrder: portfolioImages.sortOrder,
      })
      .from(portfolioImages)
      .where(inArray(portfolioImages.profileId, profileIds));

    const sectionRank: Record<string, number> = {
      promo: 0,
      product: 1,
      previous_stand: 2,
    };
    const sortedByPriority = imageRows.slice().sort((a, b) => {
      const ra = sectionRank[a.section] ?? 9;
      const rb = sectionRank[b.section] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.sortOrder - b.sortOrder;
    });
    for (const img of sortedByPriority) {
      if (!coverByProfile.has(img.profileId)) {
        coverByProfile.set(img.profileId, img.storagePath);
      }
    }
  }

  return rows
    .map((r) => ({
      applicationId: r.applicationId,
      displayName: r.displayName,
      requestedTableSizeOptionId:
        (r.answers as { tableSizeOptionId?: string } | null)
          ?.tableSizeOptionId ?? null,
      coverImagePath: coverByProfile.get(r.profileId) ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export interface FloorPlanArtistImage {
  id: string;
  url: string;
  caption: string | null;
}

export interface FloorPlanArtist {
  applicationId: string;
  displayName: string;
  pronouns: string | null;
  bio: string | null;
  websiteUrl: string | null;
  socialLinks: SocialLink[];
  images: FloorPlanArtistImage[];
  standLabel: string;
  roomId: string;
}

// Enriched artist data for the public floor-plan viewer: bio +
// social links joined onto the assignments already on the plan.
// Returns an empty list if no plan is loaded or no tables are
// assigned. Sorted by display name so search results are stable.
export async function getArtistsForFloorPlan(
  plan: ResolvedFloorPlan | null
): Promise<FloorPlanArtist[]> {
  if (!plan) return [];
  const assignmentMeta = new Map<
    string,
    { standLabel: string; roomId: string }
  >();
  for (const t of plan.tables) {
    if (t.assignment) {
      assignmentMeta.set(t.assignment.applicationId, {
        standLabel: t.label,
        roomId: t.roomId,
      });
    }
  }
  if (assignmentMeta.size === 0) return [];

  const ids = [...assignmentMeta.keys()];
  const rows = await db
    .select({
      applicationId: applications.id,
      profileId: applications.profileId,
      displayName: profiles.displayName,
      pronouns: artistProfiles.pronouns,
      bio: artistProfiles.bio,
      websiteUrl: artistProfiles.websiteUrl,
      socialLinks: artistProfiles.socialLinks,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.profileId))
    .leftJoin(
      artistProfiles,
      eq(artistProfiles.profileId, applications.profileId)
    )
    .where(inArray(applications.id, ids));

  // Pull a small portfolio sample per artist so the info card has
  // something to look at. One round-trip; we group + cap in JS.
  const profileIds = rows.map((r) => r.profileId);
  const imagesByProfile = new Map<string, FloorPlanArtistImage[]>();
  if (profileIds.length > 0) {
    const imageRows = await db
      .select({
        id: portfolioImages.id,
        profileId: portfolioImages.profileId,
        storagePath: portfolioImages.storagePath,
        caption: portfolioImages.caption,
        section: portfolioImages.section,
        sortOrder: portfolioImages.sortOrder,
      })
      .from(portfolioImages)
      .where(inArray(portfolioImages.profileId, profileIds));

    const sectionRank: Record<string, number> = {
      promo: 0,
      product: 1,
      previous_stand: 2,
    };
    for (const profileId of profileIds) {
      const ours = imageRows
        .filter((i) => i.profileId === profileId)
        .sort((a, b) => {
          const ra = sectionRank[a.section] ?? 9;
          const rb = sectionRank[b.section] ?? 9;
          if (ra !== rb) return ra - rb;
          return a.sortOrder - b.sortOrder;
        })
        .slice(0, 4)
        .map<FloorPlanArtistImage>((i) => ({
          id: i.id,
          url: storage.getUrl(i.storagePath),
          caption: i.caption,
        }));
      imagesByProfile.set(profileId, ours);
    }
  }

  return rows
    .map((r) => {
      const meta = assignmentMeta.get(r.applicationId);
      if (!meta) return null;
      return {
        applicationId: r.applicationId,
        displayName: r.displayName,
        pronouns: r.pronouns ?? null,
        bio: r.bio ?? null,
        websiteUrl: r.websiteUrl ?? null,
        socialLinks: parseSocialLinks(r.socialLinks),
        images: imagesByProfile.get(r.profileId) ?? [],
        standLabel: meta.standLabel,
        roomId: meta.roomId,
      } satisfies FloorPlanArtist;
    })
    .filter((a): a is FloorPlanArtist => a !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
