import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { events } from "@/lib/db/schema/events";
import { notifications } from "@/lib/db/schema/notifications";

export interface LandingEvent {
  id: string;
  conventionId: string;
  conventionName: string;
  conventionLogoPath: string | null;
  name: string;
  status: "published" | "accepting_applications" | "reviewing" | "results_published";
  eventStartDate: string;
  eventEndDate: string | null;
  applicationOpenDate: string | null;
  applicationCloseDate: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  availableStands: number | null;
}

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "revoked"
  | "waitlisted";

export interface ArtistApplicationRef {
  applicationId: string;
  status: ApplicationStatus;
}

export interface ArtistLandingContext {
  followedConventionIds: Set<string>;
  applicationsByEventId: Map<string, ArtistApplicationRef>;
  counts: {
    total: number;
    accepted: number;
    underReview: number;
    following: number;
  };
}

export interface LandingNotification {
  id: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAtISO: string;
}

// Fetch all non-draft events joined with their conventions, ordered by
// start date. Powers the events list on the landing page.
export async function getUpcomingEvents(): Promise<LandingEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      conventionId: events.conventionId,
      conventionName: conventions.name,
      conventionLogoPath: conventions.logoPath,
      name: events.name,
      status: events.status,
      eventStartDate: events.eventStartDate,
      eventEndDate: events.eventEndDate,
      applicationOpenDate: events.applicationOpenDate,
      applicationCloseDate: events.applicationCloseDate,
      venueCity: events.venueCity,
      venueCountry: events.venueCountry,
      availableStands: events.availableStands,
    })
    .from(events)
    .innerJoin(conventions, eq(conventions.id, events.conventionId))
    .where(ne(events.status, "draft"))
    .orderBy(asc(events.eventStartDate));

  return rows as LandingEvent[];
}

// Artist-scoped context: which conventions the artist follows, which
// events they've applied to (by status), and aggregated counts for the
// Quick Status rail card.
export async function getArtistLandingContext(
  profileId: string
): Promise<ArtistLandingContext> {
  const [followRows, applicationRows] = await Promise.all([
    db
      .select({ conventionId: conventionFollows.conventionId })
      .from(conventionFollows)
      .where(eq(conventionFollows.profileId, profileId)),
    db
      .select({
        id: applications.id,
        eventId: applications.eventId,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.profileId, profileId)),
  ]);

  const followedConventionIds = new Set(followRows.map((r) => r.conventionId));

  const applicationsByEventId = new Map<string, ArtistApplicationRef>();
  let accepted = 0;
  let underReview = 0;
  for (const row of applicationRows) {
    applicationsByEventId.set(row.eventId, {
      applicationId: row.id,
      status: row.status,
    });
    if (row.status === "accepted") accepted += 1;
    if (row.status === "under_review") underReview += 1;
  }

  return {
    followedConventionIds,
    applicationsByEventId,
    counts: {
      total: applicationRows.length,
      accepted,
      underReview,
      following: followedConventionIds.size,
    },
  };
}

// Most recent notifications for the signed-in artist.
export async function getLatestNotifications(
  profileId: string,
  limit = 3
): Promise<LandingNotification[]> {
  const rows = await db
    .select({
      id: notifications.id,
      message: notifications.message,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.recipientProfileId, profileId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    link: r.link,
    isRead: r.isRead,
    createdAtISO: r.createdAt.toISOString(),
  }));
}

// Count of unread notifications for the artist — used by the notifications
// rail card to render the "Mark all as read" affordance.
export async function getUnreadNotificationCount(
  profileId: string
): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientProfileId, profileId),
        eq(notifications.isRead, false)
      )
    );
  return rows.length;
}
