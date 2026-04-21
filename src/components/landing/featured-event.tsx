import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ApplicationStatus,
  LandingEvent,
} from "@/lib/landing/data";
import { formatDateRangeNo } from "@/lib/utils/format-date-no";
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

function statusBadgeForArtist(status: ApplicationStatus): React.ReactNode {
  switch (status) {
    case "accepted":
      return <Badge variant="success">Accepted</Badge>;
    case "under_review":
      return <Badge variant="warning">Under review</Badge>;
    case "submitted":
      return <Badge variant="default">Submitted</Badge>;
    case "rejected":
      return <Badge variant="destructive">Not selected</Badge>;
    case "revoked":
      return <Badge variant="outline">Revoked</Badge>;
  }
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

  let countdownLabel: string;
  if (days < 0) countdownLabel = "Now";
  else if (days === 0) countdownLabel = "Today";
  else if (days === 1) countdownLabel = "Tomorrow";
  else countdownLabel = `${days} days`;

  return (
    <Card className="overflow-hidden p-0 shadow-gallery">
      <div className="grid md:grid-cols-[280px_1fr]">
        <EventCover
          conventionId={event.conventionId}
          conventionName={event.conventionName}
          logoPath={event.conventionLogoPath}
          eventStartDate={event.eventStartDate}
          variant="hero"
        />
        <div className="flex flex-col gap-5 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {event.conventionName} ·{" "}
                {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
              </p>
              <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight md:text-3xl">
                {event.name}
              </h2>
            </div>
            {isArtist &&
              artistContext?.applicationStatus &&
              statusBadgeForArtist(artistContext.applicationStatus)}
          </div>

          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Starts in
            </p>
            <p
              className="mt-1 font-heading text-5xl font-extrabold leading-none tracking-tight tabular-nums"
              data-testid="featured-countdown"
            >
              {countdownLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            <span>{venue}</span>
          </div>

          <div>
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href={`/events/${event.id}`}>
                  View event
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
