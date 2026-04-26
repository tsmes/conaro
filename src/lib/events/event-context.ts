import { cache } from "react";
import { and, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { Amenities, FieldRequirements } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { applications } from "@/lib/db/schema/applications";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import {
  validateProfileForEvent,
  type ValidationResult,
} from "@/lib/applications/validation";
import { getFloorPlanForEvent } from "@/lib/floor-plans/queries";
import { getThreadForArtist } from "@/lib/threads/queries";
import type { ApplicationStatus } from "@/lib/applications/status-styles";

// "pending" is a UI-display-only status (used by the dashboard to
// mask un-published decisions); the DB never stores it, so the
// viewer-context's status field excludes it.
type ArtistApplicationStatus = Exclude<ApplicationStatus, "pending"> | null;

export interface EventViewerContext {
  event: NonNullable<Awaited<ReturnType<typeof loadEventRow>>>;
  session: Session | null;
  isArtist: boolean;
  artistProfileId: string | null;
  hasExistingApplication: boolean;
  ownApplicationStatus: ArtistApplicationStatus;
  ownApplicationId: string | null;
  ownResponseMessage: string | null;
  isFollowingConvention: boolean;
  isAcceptedToEvent: boolean;
  validationResult: ValidationResult;
}

async function loadEventRow(eventId: string) {
  const [row] = await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      status: events.status,
      eventStartDate: events.eventStartDate,
      eventEndDate: events.eventEndDate,
      applicationOpenDate: events.applicationOpenDate,
      applicationCloseDate: events.applicationCloseDate,
      venueName: events.venueName,
      venueAddress: events.venueAddress,
      venueCity: events.venueCity,
      venueCountry: events.venueCountry,
      mapEmbedUrl: events.mapEmbedUrl,
      availableStands: events.availableStands,
      tableDimensions: events.tableDimensions,
      priceInfo: events.priceInfo,
      setupTime: events.setupTime,
      teardownTime: events.teardownTime,
      amenities: events.amenities,
      fieldRequirements: events.fieldRequirements,
      minPortfolioImages: events.minPortfolioImages,
      guidelinesOverride: events.guidelinesOverride,
      tableSizeOptions: events.tableSizeOptions,
      maxAssistants: events.maxAssistants,
      assistantFeeNok: events.assistantFeeNok,
      floorPlanPublishedAt: events.floorPlanPublishedAt,
      floorPlanAutoPublishDaysBefore: events.floorPlanAutoPublishDaysBefore,
      programme: events.programme,
      guests: events.guests,
      conventionId: events.conventionId,
      conventionName: conventions.name,
      conventionLogoPath: conventions.logoPath,
      conventionGuidelines: conventions.guidelines,
      conventionDescription: conventions.description,
      waitlistEnabled: conventions.waitlistEnabled,
    })
    .from(events)
    .innerJoin(conventions, eq(conventions.id, events.conventionId))
    .where(eq(events.id, eventId));
  return row ?? null;
}

/**
 * Loads everything the public event surfaces (layout + tab pages)
 * share: the event row, the viewer's session, and — for artists —
 * their existing application, follow status, and profile-validation
 * result for apply-form gating.
 *
 * Wrapped in React's `cache()` so layout and child pages dedup
 * within a single request.
 *
 * Throws via `notFound()` for missing or draft events.
 */
export const getEventViewerContext = cache(
  async (eventId: string): Promise<EventViewerContext> => {
    const event = await loadEventRow(eventId);
    if (!event || event.status === "draft") {
      notFound();
    }

    const session = await auth();
    const profileId = session?.user?.profileId ?? null;
    const isArtist = profileId !== null && session?.user?.role === "artist";

    let hasExistingApplication = false;
    let ownApplicationStatus: ArtistApplicationStatus = null;
    let ownApplicationId: string | null = null;
    let ownResponseMessage: string | null = null;
    let isFollowingConvention = false;
    let validationResult: ValidationResult = { valid: true };

    if (isArtist && profileId) {
      const [
        [profile],
        [artistProfile],
        [{ value: imageCount }],
        [existingApp],
        [follow],
      ] = await Promise.all([
        db.select().from(profiles).where(eq(profiles.id, profileId)),
        db
          .select()
          .from(artistProfiles)
          .where(eq(artistProfiles.profileId, profileId)),
        db
          .select({ value: count() })
          .from(portfolioImages)
          .where(eq(portfolioImages.profileId, profileId)),
        db
          .select({
            id: applications.id,
            status: applications.status,
            responseMessage: applications.responseMessage,
          })
          .from(applications)
          .where(
            and(
              eq(applications.eventId, eventId),
              eq(applications.profileId, profileId)
            )
          ),
        db
          .select({ id: conventionFollows.id })
          .from(conventionFollows)
          .where(
            and(
              eq(conventionFollows.profileId, profileId),
              eq(conventionFollows.conventionId, event.conventionId)
            )
          ),
      ]);

      hasExistingApplication = Boolean(existingApp);
      ownApplicationStatus =
        (existingApp?.status as ArtistApplicationStatus) ?? null;
      ownApplicationId = existingApp?.id ?? null;
      ownResponseMessage = existingApp?.responseMessage ?? null;
      isFollowingConvention = Boolean(follow);

      if (profile && artistProfile) {
        validationResult = validateProfileForEvent(
          event.fieldRequirements as FieldRequirements | null,
          event.minPortfolioImages,
          profile,
          artistProfile,
          imageCount
        );
      }
    }

    return {
      event,
      session,
      isArtist,
      artistProfileId: profileId,
      hasExistingApplication,
      ownApplicationStatus,
      ownApplicationId,
      ownResponseMessage,
      isFollowingConvention,
      isAcceptedToEvent: ownApplicationStatus === "accepted",
      validationResult,
    };
  }
);

/** Request-scoped wrapper around getFloorPlanForEvent so layout
 *  (for tab gating) and the floor-plan page reuse the same query. */
export const getCachedFloorPlan = cache(getFloorPlanForEvent);

/** Request-scoped wrapper around getThreadForArtist so layout
 *  (for tab gating) and the messages page reuse the same query. */
export const getCachedThreadForArtist = cache(getThreadForArtist);

/** Helper used by the layout's tabs nav: should the Floor plan tab
 *  be shown? Cheap when the plan is already in cache. */
export async function shouldShowFloorPlanTab(
  ctx: EventViewerContext
): Promise<boolean> {
  if (!ctx.event.floorPlanPublishedAt) return false;
  const plan = await getCachedFloorPlan(ctx.event.id);
  return Boolean(plan && plan.tables.length > 0);
}

/** Helper for the layout's tabs nav: should the Messages tab be
 *  shown? Only the accepted artist with an existing thread sees it. */
export async function shouldShowMessagesTab(
  ctx: EventViewerContext
): Promise<boolean> {
  if (!ctx.isAcceptedToEvent || !ctx.artistProfileId) return false;
  const thread = await getCachedThreadForArtist(
    ctx.event.id,
    ctx.artistProfileId
  );
  return Boolean(thread);
}

/** Helper for the layout's tabs nav: should the Artists tab be
 *  shown? Once results are published and at least one artist has
 *  been accepted, the public gets a confirmed-artists gallery. */
export async function shouldShowArtistsTab(
  ctx: EventViewerContext
): Promise<boolean> {
  if (ctx.event.status !== "results_published") return false;
  // Reuses the same cached floor-plan query that the floor-plan tab
  // gating already loads, so this check is free when we're publishing
  // assignments — and when no plan exists yet, falls back to checking
  // accepted applications cheaply.
  const plan = await getCachedFloorPlan(ctx.event.id);
  if (plan && plan.tables.some((t) => t.assignment !== null)) return true;
  // If the plan is empty (or hasn't been built yet), we don't show
  // the tab — there's nothing to display until assignments exist.
  return false;
}

/** Helper for the layout's tabs nav: does the event have enough
 *  practical content (venue address, amenities, map link) to warrant
 *  its own tab? */
export function shouldShowPracticalTab(ctx: EventViewerContext): boolean {
  const e = ctx.event;
  return Boolean(
    e.venueAddress ||
      e.mapEmbedUrl ||
      e.setupTime ||
      e.teardownTime ||
      e.amenities
  );
}

/** Helper used by the status card: does the accepted artist's
 *  application have a table assignment on the event's floor plan?
 *  Reuses the cached plan so it's a free check after
 *  shouldShowFloorPlanTab. */
export async function hasAssignedTableForViewer(
  ctx: EventViewerContext
): Promise<boolean> {
  if (
    !ctx.isAcceptedToEvent ||
    !ctx.ownApplicationId ||
    !ctx.event.floorPlanPublishedAt
  ) {
    return false;
  }
  const plan = await getCachedFloorPlan(ctx.event.id);
  return Boolean(
    plan?.tables.some(
      (t) => t.assignment?.applicationId === ctx.ownApplicationId
    )
  );
}

export type { Amenities, FieldRequirements };
