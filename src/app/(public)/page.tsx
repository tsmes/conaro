import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { computeCompleteness } from "@/lib/profile/completeness";
import {
  getArtistLandingContext,
  getLatestNotifications,
  getUnreadNotificationCount,
  getUpcomingEvents,
  type ArtistLandingContext,
  type LandingEvent,
} from "@/lib/landing/data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingHeader } from "@/components/landing/landing-header";
import { FeaturedEvent } from "@/components/landing/featured-event";
import { EventCard } from "@/components/landing/event-card";
import { ArtistRail } from "@/components/landing/artist-rail";
import { PublicRail } from "@/components/landing/public-rail";

type LandingViewer = "public" | "artist" | "organizer";

interface HomePageProps {
  searchParams: Promise<{ filter?: string; country?: string }>;
}

const ARTIST_FILTERS = new Set(["all", "following", "open", "applications"]);
const PUBLIC_FILTERS = new Set(["all", "3m", "country"]);

function pickViewer(role: string | undefined): LandingViewer {
  if (role === "artist") return "artist";
  if (role === "organizer") return "organizer";
  return "public";
}

function todayUtcMs(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isOpenForApplications(e: LandingEvent, todayMs: number): boolean {
  if (e.status !== "accepting_applications") return false;
  if (!e.applicationCloseDate) return true;
  const close = new Date(`${e.applicationCloseDate}T23:59:59Z`).getTime();
  return close >= todayMs;
}

function applyPrimaryFilter(
  events: LandingEvent[],
  viewer: LandingViewer,
  filter: string,
  ctx: ArtistLandingContext | null
): LandingEvent[] {
  const todayMs = todayUtcMs();
  if (viewer === "artist" && ctx) {
    if (filter === "following") {
      return events.filter((e) => ctx.followedConventionIds.has(e.conventionId));
    }
    if (filter === "open") {
      return events.filter((e) => isOpenForApplications(e, todayMs));
    }
    if (filter === "applications") {
      return events.filter((e) => ctx.applicationsByEventId.has(e.id));
    }
  } else {
    if (filter === "3m") {
      const cutoff = todayMs + 92 * 86_400_000;
      return events.filter(
        (e) => new Date(`${e.eventStartDate}T00:00:00Z`).getTime() <= cutoff
      );
    }
    // 'country' has no primary filter effect — country chips do the work
  }
  return events;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const session = await auth();
  const viewer = pickViewer(session?.user?.role);

  const allowedFilters = viewer === "artist" ? ARTIST_FILTERS : PUBLIC_FILTERS;
  const activeFilter =
    params.filter && allowedFilters.has(params.filter) ? params.filter : "all";
  const activeCountry = params.country?.trim() || null;

  const allEvents = await getUpcomingEvents();

  let artistContext: ArtistLandingContext | null = null;
  let notifications: Awaited<ReturnType<typeof getLatestNotifications>> = [];
  let unreadCount = 0;
  let completeness: ReturnType<typeof computeCompleteness> | null = null;
  let firstName: string | null = null;

  if (viewer === "artist" && session?.user?.profileId) {
    const profileId = session.user.profileId;
    const [
      ctx,
      notifs,
      unread,
      [profile],
      [artistProfile],
      [{ value: imageCount }],
    ] = await Promise.all([
      getArtistLandingContext(profileId),
      getLatestNotifications(profileId, 3),
      getUnreadNotificationCount(profileId),
      db.select().from(profiles).where(eq(profiles.id, profileId)),
      db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.profileId, profileId)),
      db
        .select({ value: count() })
        .from(portfolioImages)
        .where(eq(portfolioImages.profileId, profileId)),
    ]);
    artistContext = ctx;
    notifications = notifs;
    unreadCount = unread;
    completeness = computeCompleteness(profile, artistProfile, imageCount);
    firstName =
      (profile?.displayName ?? session.user.name ?? "")
        .trim()
        .split(/\s+/)[0] || null;
  }

  // Primary filter, then derive available countries, then country filter.
  const afterPrimary = applyPrimaryFilter(
    allEvents,
    viewer,
    activeFilter,
    artistContext
  );
  const availableCountries = Array.from(
    new Set(
      afterPrimary
        .map((e) => e.venueCountry)
        .filter((c): c is string => Boolean(c))
    )
  ).sort();
  const filtered = activeCountry
    ? afterPrimary.filter((e) => e.venueCountry === activeCountry)
    : afterPrimary;

  const [featured, ...rest] = filtered;

  const railViewer: "public" | "organizer" =
    viewer === "organizer" ? "organizer" : "public";

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-16 md:px-8">
      <LandingHeader
        viewer={viewer}
        firstName={firstName}
        activeFilter={activeFilter}
        activeCountry={activeCountry}
        availableCountries={availableCountries}
      />

      <div className="mt-2 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {featured ? (
            <FeaturedEvent
              event={featured}
              viewer={viewer}
              artistContext={
                viewer === "artist" && artistContext
                  ? {
                      applicationStatus:
                        artistContext.applicationsByEventId.get(featured.id)
                          ?.status ?? null,
                      applicationId: artistContext.applicationsByEventId.get(
                        featured.id
                      )?.applicationId,
                      isFollowingConvention:
                        artistContext.followedConventionIds.has(
                          featured.conventionId
                        ),
                    }
                  : undefined
              }
            />
          ) : (
            <Card className="px-6 py-12 text-center">
              <h2 className="font-heading text-lg font-extrabold tracking-tight">
                No events match this view
              </h2>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Try a different filter or browse the full directory.
              </p>
              <div className="mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/events">Browse directory</Link>}
                />
              </div>
            </Card>
          )}

          {rest.length > 0 && (
            <>
              <div className="flex items-center justify-between pt-2">
                <h2 className="font-heading text-base font-extrabold tracking-tight">
                  All upcoming
                </h2>
                <span className="font-mono text-[11.5px] text-muted-foreground">
                  {filtered.length} event{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-4">
                {rest.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    viewer={viewer}
                    artistContext={
                      viewer === "artist" && artistContext
                        ? {
                            applicationStatus:
                              artistContext.applicationsByEventId.get(e.id)
                                ?.status ?? null,
                            applicationId:
                              artistContext.applicationsByEventId.get(e.id)
                                ?.applicationId,
                            isFollowingConvention:
                              artistContext.followedConventionIds.has(
                                e.conventionId
                              ),
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {viewer === "artist" && completeness && artistContext ? (
          <ArtistRail
            counts={artistContext.counts}
            completeness={completeness}
            notifications={notifications}
            unreadNotificationCount={unreadCount}
          />
        ) : (
          <PublicRail
            events={afterPrimary}
            viewer={railViewer}
            activeCountry={activeCountry}
          />
        )}
      </div>
    </div>
  );
}
