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

  return (
    <Card className="overflow-hidden p-0">
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
                {!hasApplication && open && (
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
      </div>
    </Card>
  );
}
