import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  type ApplicationStatus,
  type LandingEvent,
} from "@/lib/landing/data";
import { formatDateRangeNo } from "@/lib/utils/format-date-no";
import { artistVisibleStatus } from "@/lib/applications/artist-visible-status";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { EventCover } from "./event-cover";
import { EventContextStrip } from "./event-context-strip";
import { FollowButton } from "./follow-button";

export interface ArtistEventContext {
  applicationStatus: ApplicationStatus | null;
  applicationId?: string;
  isFollowingConvention: boolean;
}

export interface EventCardProps {
  event: LandingEvent;
  viewer: "public" | "artist" | "organizer";
  artistContext?: ArtistEventContext;
}

function statusBadgeForArtist(
  status: ApplicationStatus,
  eventStatus: LandingEvent["status"]
): React.ReactNode {
  const visible = artistVisibleStatus(status, eventStatus);
  switch (visible) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "accepted":
      return <Badge variant="success">Accepted</Badge>;
    case "under_review":
      return <Badge variant="warning">Under review</Badge>;
    case "submitted":
      return <Badge variant="default">Submitted</Badge>;
    case "rejected":
      return <Badge variant="destructive">Not selected</Badge>;
    case "waitlisted":
      return <Badge variant="secondary">Waitlisted</Badge>;
    case "revoked":
      return <Badge variant="outline">Revoked</Badge>;
  }
}

function isApplicationOpen(event: LandingEvent, today: Date): boolean {
  if (event.status !== "accepting_applications") return false;
  if (!event.applicationCloseDate) return true;
  const close = new Date(`${event.applicationCloseDate}T23:59:59Z`);
  return close.getTime() >= today.getTime();
}

function daysUntilStart(eventStartDate: string, today: Date): number {
  const start = new Date(`${eventStartDate}T00:00:00`);
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  return Math.round(
    (start.getTime() - todayMidnight.getTime()) / 86_400_000
  );
}

function CountdownBlock({ days }: { days: number }) {
  const display =
    days < 0 ? "Now" : days === 0 ? "Today" : days.toString();
  const showLabel = days > 0;
  return (
    <div className="hidden shrink-0 flex-col items-center justify-center border-l border-border bg-primary/15 px-6 md:flex">
      <span
        className={cn(
          "font-heading font-extrabold leading-none tracking-[-0.06em] text-foreground",
          // Big countdown panel — large numerals match the design's
          // "days to go" treatment. Drop a touch on huge values to
          // keep it from overflowing on 4-digit day counts.
          display.length >= 4 ? "text-[80px]" : "text-[120px]"
        )}
      >
        {display}
      </span>
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Days to go
        </span>
      )}
    </div>
  );
}

function dateStampSmall(iso: string): { day: string; month: string } {
  const [, , dayStr] = iso.split("-");
  const month = new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
  });
  return {
    day: String(Number.parseInt(dayStr ?? "1", 10)),
    month: month.toUpperCase(),
  };
}

function MobileTopStripe({
  conventionId,
  conventionName,
  logoPath,
  eventStartDate,
  days,
}: {
  conventionId: string;
  conventionName: string;
  logoPath: string | null;
  eventStartDate: string;
  days: number;
}) {
  const stamp = dateStampSmall(eventStartDate);
  const hasLogo = Boolean(logoPath);
  const gradientClass = hasLogo ? null : pickCoverGradient(conventionId);
  const initials = (() => {
    const parts = conventionName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  })();
  const countdown =
    days < 0 ? "Now" : days === 0 ? "Today" : `in ${days}d`;
  return (
    <div
      className={cn(
        // Mobile top section. Bumped vertical padding + min height
        // by ~50% so the logo / gradient gets more visual weight
        // at the top of each upcoming-event card.
        "relative flex min-h-[84px] items-center gap-3 px-4 py-5 text-white sm:hidden",
        gradientClass
      )}
      style={
        hasLogo && logoPath
          ? {
              backgroundImage: `url(${storage.getUrl(logoPath)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {hasLogo && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/30 to-black/50"
        />
      )}
      <div className="relative flex items-baseline gap-1.5">
        <span className="font-heading text-[26px] font-extrabold leading-none tracking-[-0.02em]">
          {stamp.day}
        </span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] opacity-90">
          {stamp.month}
        </span>
      </div>
      <span className="relative ml-1 truncate font-mono text-[11px] opacity-90">
        {countdown}
      </span>
      <span className="relative ml-auto grid size-7 place-items-center rounded-md bg-black/30 text-[10px] font-bold tracking-tight backdrop-blur-sm">
        {initials}
      </span>
    </div>
  );
}

export function EventCard({ event, viewer, artistContext }: EventCardProps) {
  const isArtist = viewer === "artist";
  const today = new Date();
  const venue =
    [event.venueCity, event.venueCountry].filter(Boolean).join(", ") || "TBA";
  const open = isApplicationOpen(event, today);
  const hasApplication = Boolean(artistContext?.applicationStatus);
  const isOpenCallToFollowedConvention =
    isArtist &&
    open &&
    !hasApplication &&
    Boolean(artistContext?.isFollowingConvention);

  const showContextStrip =
    isArtist && (hasApplication || isOpenCallToFollowedConvention);

  const days = daysUntilStart(event.eventStartDate, today);

  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <MobileTopStripe
        conventionId={event.conventionId}
        conventionName={event.conventionName}
        logoPath={event.conventionLogoPath}
        eventStartDate={event.eventStartDate}
        days={days}
      />
      <div className="flex">
        <EventCover
          conventionId={event.conventionId}
          conventionName={event.conventionName}
          logoPath={event.conventionLogoPath}
          eventStartDate={event.eventStartDate}
          variant="card"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
          <Link
            href={`/events/${event.id}`}
            className="group/card-link block min-w-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {event.conventionName}
                </p>
                <h3 className="mt-1 font-heading text-lg font-extrabold leading-tight tracking-tight group-hover/card-link:text-primary">
                  {event.name}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {isArtist &&
                  artistContext?.applicationStatus &&
                  statusBadgeForArtist(
                    artistContext.applicationStatus,
                    event.status
                  )}
                {/* "Applications open" only matters to artists who could
                    actually apply — public visitors don't need the
                    inside-baseball badge. */}
                {isArtist && !hasApplication && open && (
                  <Badge variant="default">Applications open</Badge>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                <span className="font-semibold">
                  {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3.5" />
                {venue}
              </span>
            </div>
          </Link>

          {showContextStrip && (
            <EventContextStrip
              event={event}
              applicationStatus={artistContext?.applicationStatus ?? null}
              isOpenCallToFollowedConvention={isOpenCallToFollowedConvention}
            />
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/events/${event.id}`}>
                  View event
                  <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {isArtist && open && !hasApplication && (
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`/events/${event.id}`}>
                    Apply
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
            )}
            {isArtist && hasApplication && artistContext?.applicationId && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`/events/${event.id}`}>View application</Link>
                }
              />
            )}
            {isArtist && (
              <div className="ml-auto">
                <FollowButton
                  conventionId={event.conventionId}
                  isFollowing={Boolean(artistContext?.isFollowingConvention)}
                />
              </div>
            )}
          </div>
        </div>
        <CountdownBlock days={days} />
      </div>
    </Card>
  );
}
