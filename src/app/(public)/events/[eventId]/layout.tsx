import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Heart,
  MapPin,
} from "lucide-react";

import {
  getEventViewerContext,
  shouldShowArtistsTab,
  shouldShowFloorPlanTab,
  shouldShowGuestsTab,
  shouldShowMessagesTab,
  shouldShowPracticalTab,
  shouldShowProgrammeTab,
} from "@/lib/events/event-context";
import { getAcceptedArtistsForEvent } from "@/lib/floor-plans/queries";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { storage } from "@/lib/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FollowButton } from "@/components/conventions/follow-button";
import { ArtistEventTabsNav } from "@/components/events/artist-event-tabs-nav";
import { formatDateNo, formatDateRangeNo } from "@/lib/utils/format-date-no";
import { cn } from "@/lib/utils";

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);
  const {
    event,
    session,
    isArtist,
    isFollowingConvention,
    ownApplicationStatus,
  } = ctx;
  const isLoggedIn = Boolean(session?.user);

  const start = new Date(`${event.eventStartDate}T00:00:00`);
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const daysUntilEvent = Math.round(
    (start.getTime() - todayMidnight.getTime()) / 86_400_000
  );
  const showCountdown = daysUntilEvent >= 0;

  const conventionLogoUrl = event.conventionLogoPath
    ? storage.getUrl(event.conventionLogoPath)
    : null;
  // Effective branding cascades event → convention → built-in.
  // Each field is resolved independently, so an event can override
  // (say) just the header colour while still inheriting the
  // convention's banner.
  const effectiveBannerPath =
    event.bannerPath ?? event.conventionBannerPath ?? null;
  const effectiveBannerMobilePath =
    event.bannerMobilePath ??
    event.conventionBannerMobilePath ??
    effectiveBannerPath;
  const effectiveHeaderColor =
    event.headerColor ?? event.conventionHeaderColor ?? null;
  const bannerUrl = effectiveBannerPath
    ? storage.getUrl(effectiveBannerPath)
    : null;
  const bannerMobileUrl = effectiveBannerMobilePath
    ? storage.getUrl(effectiveBannerMobilePath)
    : null;
  const heroGradientClass = pickCoverGradient(event.conventionId);

  // Run every layout-side fetch in parallel. The accepted-artists
  // marquee is only meaningful once results are out — skip the query
  // before then.
  const [showFloorPlan, showMessages, showArtists, acceptedArtists] =
    await Promise.all([
      shouldShowFloorPlanTab(ctx),
      shouldShowMessagesTab(ctx),
      shouldShowArtistsTab(ctx),
      event.status === "results_published"
        ? getAcceptedArtistsForEvent(event.id)
        : Promise.resolve([]),
    ]);
  const showPractical = shouldShowPracticalTab(ctx);
  const showProgramme = shouldShowProgrammeTab(ctx);
  const showGuests = shouldShowGuestsTab(ctx);
  const programmeCount = ctx.event.programme?.length;
  const guestsCount = ctx.event.guests?.length;

  const venueLine = [event.venueCity, event.venueCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      {/* Hero. The optional banner sits behind the title block on
          every breakpoint and a dark overlay keeps text legible.
          The mobile banner asset is shown < md (typically a tall
          / portrait crop), the desktop banner from md+. When
          neither asset is uploaded we fall back to the
          effectiveHeaderColor or the auto-picked gradient. */}
      <section className="overflow-hidden text-white">
        <div className="relative">
          {bannerMobileUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerMobileUrl}
              alt=""
              aria-hidden
              // object-top so organizers can extend the photo
              // downwards (logo at the top, room for the title to
              // overlay underneath). Default `center` would crop
              // the logo away on tall heroes.
              className="absolute inset-0 block h-full w-full object-cover object-top md:hidden"
            />
          )}
          {bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 hidden h-full w-full object-cover object-top md:block"
            />
          )}
          {/* Coloured backdrop only shows where there's no photo
              to back: hidden < md when a mobile banner exists,
              hidden md+ when a desktop banner exists. */}
          <div
            className={cn(
              "absolute inset-0",
              bannerMobileUrl ? "hidden md:block" : "",
              bannerUrl ? "md:hidden" : "",
              effectiveHeaderColor ? "" : heroGradientClass
            )}
            style={
              effectiveHeaderColor
                ? { backgroundColor: effectiveHeaderColor }
                : undefined
            }
            aria-hidden
          />
          {/* Dark overlay. Stronger when a photo is showing on this
              breakpoint, softer when only the gradient is. */}
          <div
            className="absolute inset-0 hidden md:block"
            aria-hidden
            style={{
              background: bannerUrl
                ? "linear-gradient(to bottom, rgba(0,0,0,.30) 0%, rgba(0,0,0,.55) 100%)"
                : "radial-gradient(120% 80% at 80% 20%, rgba(255,255,255,.18), transparent 60%), linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,.45) 100%)",
            }}
          />
          <div
            className="absolute inset-0 md:hidden"
            aria-hidden
            style={{
              background: bannerMobileUrl
                ? "linear-gradient(to bottom, rgba(0,0,0,.30) 0%, rgba(0,0,0,.55) 100%)"
                : "radial-gradient(120% 80% at 80% 20%, rgba(255,255,255,.18), transparent 60%), linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,.45) 100%)",
            }}
          />
          <div className="relative mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 md:py-16">
          {/* Breadcrumb / back */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[12px] font-semibold text-white/85"
          >
            <Link href="/" className="inline-flex items-center gap-1.5 hover:underline">
              <ArrowLeft className="size-3.5" /> All events
            </Link>
            <ChevronRight className="size-3 opacity-60" />
            <Link
              href={`/conventions/${event.conventionId}`}
              className="hover:underline"
            >
              {event.conventionName}
            </Link>
            <ChevronRight className="size-3 opacity-60" />
            <span className="truncate text-white">{event.name}</span>
          </nav>

          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-lg">
                  {conventionLogoUrl && (
                    <AvatarImage src={conventionLogoUrl} alt="" />
                  )}
                  <AvatarFallback className="rounded-lg bg-white/15 text-xs font-semibold text-white">
                    {conventionInitials(event.conventionName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/85">
                  {event.conventionName}
                </span>
              </div>
              <h1 className="mt-3 font-heading text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[1] tracking-[-0.03em]">
                {event.name}
              </h1>
              {event.description && (
                <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-white/85 sm:text-[15.5px]">
                  {event.description}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px] text-white/95">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  <span className="font-semibold">
                    {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
                  </span>
                </span>
                {(event.venueName || venueLine) && (
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <MapPin className="size-4" />
                    <span className="font-semibold truncate">
                      {event.venueName ?? venueLine}
                    </span>
                    {event.venueName && venueLine && (
                      <span className="text-white/70">· {venueLine}</span>
                    )}
                  </span>
                )}
              </div>
              {/* Hero actions: status badge for the artist, follow CTA */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {isArtist && (
                  <FollowButton
                    conventionId={event.conventionId}
                    isFollowing={isFollowingConvention}
                  />
                )}
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/35 bg-white/10 px-4 text-[13px] font-semibold text-white transition hover:bg-white/15"
                  >
                    <Heart className="size-4" /> Sign in to follow
                  </Link>
                )}
                {isLoggedIn && (
                  <>
                    {event.status === "published" &&
                      event.applicationOpenDate && (
                        <Badge
                          variant="outline"
                          className="border-white/35 bg-white/10 text-white"
                        >
                          Applications open{" "}
                          {formatDateNo(event.applicationOpenDate)}
                        </Badge>
                      )}
                    {event.status === "reviewing" && (
                      <Badge
                        variant="outline"
                        className="border-white/35 bg-white/10 text-white"
                      >
                        Applications under review
                      </Badge>
                    )}
                    {event.status === "results_published" &&
                      (ownApplicationStatus === "accepted" ? (
                        <Badge variant="success">Accepted</Badge>
                      ) : ownApplicationStatus === "waitlisted" ? (
                        <Badge variant="warning">Waitlisted</Badge>
                      ) : ownApplicationStatus === "rejected" ? (
                        <Badge variant="destructive">Not selected</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-white/35 bg-white/10 text-white"
                        >
                          Results published
                        </Badge>
                      ))}
                  </>
                )}
              </div>
            </div>
            {/* Days-to-go card on the right. Backdrop is a dark
                tint (not bg-white/12) so the white "X days" reads
                cleanly even when the hero sits on a light header
                colour or a light upper region of the banner photo. */}
            {showCountdown && (
              <div className="lg:text-right">
                <div className="inline-flex flex-col gap-1 rounded-[14px] border border-white/25 bg-black/35 px-5 py-4 backdrop-blur-md">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/80">
                    Doors open in
                  </div>
                  <div className="font-heading font-extrabold leading-none text-[clamp(2.6rem,5vw,3.4rem)] tabular-nums">
                    {daysUntilEvent === 0 ? "Today" : daysUntilEvent}
                    {daysUntilEvent > 0 && (
                      <span className="ml-1.5 text-[14px] font-bold uppercase tracking-[0.16em] text-white/80">
                        days
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[12px] text-white/80">
                    {start.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        {acceptedArtists.length > 0 && (
          <ArtistMarquee artists={acceptedArtists} />
        )}
      </section>

      {/* Sticky pill tab bar */}
      <div className="sticky top-14 z-30 border-b border-border bg-background/80 backdrop-blur sm:top-16">
        <div className="mx-auto max-w-[1240px] px-4 py-3 sm:px-6">
          <ArtistEventTabsNav
            eventId={event.id}
            showFloorPlan={showFloorPlan}
            showMessages={showMessages}
            showArtists={showArtists}
            showPractical={showPractical}
            showProgramme={showProgramme}
            showGuests={showGuests}
            artistsCount={acceptedArtists.length}
            programmeCount={programmeCount}
            guestsCount={guestsCount}
          />
        </div>
      </div>

      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Per-tab content — the response message and any
            applicant-only CTAs are surfaced inside the Messages
            (and Overview as a fallback) tabs, not above every tab. */}
        {children}
      </main>
    </div>
  );
}

interface MarqueeArtist {
  applicationId: string;
  displayName: string;
}

function ArtistMarquee({ artists }: { artists: MarqueeArtist[] }) {
  // Duplicate the list so the keyframe-driven translate to -50%
  // lands the second copy where the first started — seamless loop.
  const doubled = [...artists, ...artists];
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-t border-white/15 bg-black/25 py-2"
    >
      <ul className="marquee-track text-[12.5px] font-semibold text-white/85">
        {doubled.map((a, i) => (
          <li
            key={`${a.applicationId}-${i}`}
            className="flex items-center gap-2 px-2"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-white/60" />
            {a.displayName}
          </li>
        ))}
      </ul>
      <span className="sr-only">
        Confirmed artists: {artists.map((a) => a.displayName).join(", ")}
      </span>
    </div>
  );
}
