import { notFound } from "next/navigation";
import { ExternalLink, Info, MapPin, Plug, Users } from "lucide-react";

import {
  getEventViewerContext,
  shouldShowPracticalTab,
} from "@/lib/events/event-context";
import type { Amenities } from "@/lib/db/schema/events";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface PracticalPageProps {
  params: Promise<{ eventId: string }>;
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
      {children}
    </p>
  );
}

export default async function PracticalInfoPage({ params }: PracticalPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);

  // Layout-level gating already hides this tab when there's nothing
  // to render, but defend on direct URL access.
  if (!shouldShowPracticalTab(ctx)) notFound();

  const { event, isArtist, session } = ctx;
  // Setup / teardown windows and the amenities checklist are
  // operations-side info — public visitors browsing the event don't
  // need them and the inside-baseball labels add noise. Logged-in
  // viewers (artists + organizers) still see everything.
  const isLoggedIn = Boolean(session?.user);
  const amenities = event.amenities as Amenities | null;
  const venueLine = [event.venueCity, event.venueCountry]
    .filter(Boolean)
    .join(", ");
  const amenityChips = amenities
    ? [
        amenities.electricity && "Electricity",
        amenities.wifi && "Wi-Fi",
        amenities.tables && "Tables",
        amenities.chairs && "Chairs",
      ].filter((v): v is string => Boolean(v))
    : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(event.venueName || event.venueAddress || event.mapEmbedUrl) && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-[8px] bg-primary/10 text-primary">
              <MapPin className="size-4" />
            </div>
            <h3 className="font-heading text-[15px] font-extrabold">
              Getting there
            </h3>
          </div>
          <div className="space-y-2 text-[13.5px]">
            {event.venueName && (
              <p className="font-semibold">{event.venueName}</p>
            )}
            {event.venueAddress && (
              <p className="text-muted-foreground">{event.venueAddress}</p>
            )}
            {venueLine && (
              <p className="text-muted-foreground">{venueLine}</p>
            )}
            {event.mapEmbedUrl && (
              <a
                href={event.mapEmbedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary"
              >
                Open in maps <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </Card>
      )}

      {isLoggedIn && (event.setupTime || event.teardownTime) && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-[8px] bg-primary/10 text-primary">
              <Info className="size-4" />
            </div>
            <h3 className="font-heading text-[15px] font-extrabold">
              Schedule
            </h3>
          </div>
          <div className="space-y-2 text-[13.5px]">
            {event.setupTime && (
              <p>
                <span className="text-muted-foreground">Setup:</span>{" "}
                <span className="font-semibold">{event.setupTime}</span>
              </p>
            )}
            {event.teardownTime && (
              <p>
                <span className="text-muted-foreground">Teardown:</span>{" "}
                <span className="font-semibold">{event.teardownTime}</span>
              </p>
            )}
          </div>
        </Card>
      )}

      {isLoggedIn && amenityChips.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-[8px] bg-primary/10 text-primary">
              <Plug className="size-4" />
            </div>
            <h3 className="font-heading text-[15px] font-extrabold">
              Provided amenities
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {amenityChips.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
          {amenities?.other && (
            <p className="mt-3 text-sm text-muted-foreground">
              {amenities.other}
            </p>
          )}
        </Card>
      )}

      {/* Stand counts, table dimensions and pricing are only
          relevant to artists deciding whether to apply. Hide for
          public visitors and organizers — they see this info in
          their own surfaces. */}
      {isArtist &&
        (event.availableStands || event.tableDimensions || event.priceInfo) && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-[8px] bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <h3 className="font-heading text-[15px] font-extrabold">
              For artists
            </h3>
          </div>
          <div className="space-y-2 text-[13.5px]">
            {event.availableStands && (
              <p>
                <span className="text-muted-foreground">Stands:</span>{" "}
                <span className="font-semibold">{event.availableStands}</span>
              </p>
            )}
            {event.tableDimensions && (
              <p>
                <span className="text-muted-foreground">Table:</span>{" "}
                <span className="font-semibold">{event.tableDimensions}</span>
              </p>
            )}
            {event.priceInfo && (
              <p>
                <span className="text-muted-foreground">Price:</span>{" "}
                <span className="font-semibold">{event.priceInfo}</span>
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
