import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ApplicationStatus,
  LandingEvent,
} from "@/lib/landing/data";
import {
  formatDateNo,
  formatDateRangeNo,
} from "@/lib/utils/format-date-no";
import { artistVisibleStatus } from "@/lib/applications/artist-visible-status";
import { EventCover } from "./event-cover";
import type { ArtistEventContext } from "./event-card";

function daysUntil(targetIso: string, today: Date): number {
  const target = new Date(`${targetIso}T00:00:00Z`);
  const utcToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return Math.ceil((target.getTime() - utcToday) / 86_400_000);
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

interface MetaCellProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

function MetaCell({ icon, label, value, sub }: MetaCellProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate font-semibold">{value}</div>
      {sub && (
        <div className="truncate font-mono text-[11px] text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}

export interface FeaturedEventProps {
  event: LandingEvent;
  viewer: "public" | "artist" | "organizer";
  artistContext?: ArtistEventContext;
}

export function FeaturedEvent({
  event,
  viewer,
  artistContext,
}: FeaturedEventProps) {
  const isArtist = viewer === "artist";
  const today = new Date();
  const days = daysUntil(event.eventStartDate, today);
  const venue =
    [event.venueCity, event.venueCountry].filter(Boolean).join(", ") || "TBA";

  const closeDate = event.applicationCloseDate;
  const openDate = event.applicationOpenDate;
  const appsState = (() => {
    if (event.status === "results_published") {
      return { value: "Results out", sub: "see card details" };
    }
    if (event.status === "accepting_applications") {
      return {
        value: "Open",
        sub: closeDate ? `closes ${formatDateNo(closeDate)}` : "no deadline",
      };
    }
    if (event.status === "reviewing") {
      return { value: "Reviewing", sub: "decisions soon" };
    }
    return {
      value: "Coming soon",
      sub: openDate ? `opens ${formatDateNo(openDate)}` : "tba",
    };
  })();

  const standsTotal = event.availableStands ?? null;

  return (
    <Card className="overflow-hidden p-0 shadow-lg">
      <div className="grid md:grid-cols-[280px_1fr]">
        <EventCover
          conventionId={event.conventionId}
          conventionName={event.conventionName}
          logoPath={event.conventionLogoPath}
          eventStartDate={event.eventStartDate}
          variant="hero"
        />
        <div className="flex flex-col gap-4 p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {event.conventionName}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-extrabold leading-tight tracking-[-0.02em] md:text-3xl">
                {event.name}
              </h2>
              <p className="mt-1 font-mono text-[12.5px] text-muted-foreground">
                {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
              </p>
            </div>
            {isArtist &&
              artistContext?.applicationStatus &&
              statusBadgeForArtist(
                artistContext.applicationStatus,
                event.status
              )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Starts in
              </p>
              <p
                className="mt-1 font-heading font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[34px] sm:text-[40px]"
                data-testid="featured-countdown"
              >
                {days < 0 ? (
                  "Now"
                ) : days === 0 ? (
                  "Today"
                ) : (
                  <>
                    {days}
                    <span className="ml-1.5 text-[14px] font-semibold text-muted-foreground sm:text-[16px]">
                      {days === 1 ? "day" : "days"}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12.5px] md:grid-cols-3">
            <MetaCell
              icon={<MapPin className="size-3.5" />}
              label="Venue"
              value={venue}
              sub={event.venueCountry ?? "Nordics"}
            />
            <MetaCell
              icon={<CalendarDays className="size-3.5" />}
              label="Applications"
              value={appsState.value}
              sub={appsState.sub}
            />
            {standsTotal !== null ? (
              <MetaCell
                icon={<Users className="size-3.5" />}
                label="Stands"
                value={`${standsTotal}`}
                sub="available"
              />
            ) : (
              <MetaCell
                icon={<Ticket className="size-3.5" />}
                label="Format"
                value="Artist alley"
                sub="see event details"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="default"
              nativeButton={false}
              render={
                <Link href={`/events/${event.id}`}>
                  Event details
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button
              size="default"
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/conventions/${event.conventionId}`}>
                  About the convention
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
