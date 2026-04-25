import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Users } from "lucide-react";

import { getEventViewerContext } from "@/lib/events/event-context";
import type { Amenities } from "@/lib/db/schema/events";
import { ApplyButton } from "@/components/events/apply-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { formatDateNo, formatDateRangeNo } from "@/lib/utils/format-date-no";

interface EventDetailPageProps {
  params: Promise<{ eventId: string }>;
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
      {children}
    </p>
  );
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);
  const { event, session, isArtist, hasExistingApplication, validationResult } =
    ctx;

  const amenities = event.amenities as Amenities | null;
  const isAccepting = event.status === "accepting_applications";
  const venueLine = [event.venueCity, event.venueCountry]
    .filter(Boolean)
    .join(", ");
  const hasArtistLogistics =
    Boolean(session?.user) &&
    (event.availableStands || event.tableDimensions || event.priceInfo);
  const amenityChips = amenities
    ? [
        amenities.electricity && "Electricity",
        amenities.wifi && "Wi-Fi",
        amenities.tables && "Tables",
        amenities.chairs && "Chairs",
      ].filter(Boolean as unknown as (v: string | false | undefined) => v is string)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left column — about, logistics, apply */}
      <div className="space-y-6 min-w-0">
        {event.description && (
          <Card className="p-6 md:p-8">
            <Overline>About this event</Overline>
            <div className="mt-3">
              <Markdown source={event.description} className="text-foreground" />
            </div>
          </Card>
        )}

        {event.conventionDescription && (
          <Card className="p-6 md:p-8">
            <Overline>About the convention</Overline>
            <div className="mt-3">
              <Markdown
                source={event.conventionDescription}
                className="text-muted-foreground"
              />
            </div>
          </Card>
        )}

        {hasArtistLogistics && (
          <Card className="p-6 md:p-8">
            <Overline>Artist logistics</Overline>
            <h3 className="mt-2 font-heading text-[18px] font-extrabold tracking-tight">
              What you need to know
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {event.availableStands && (
                <DetailField label="Available stands">
                  {event.availableStands}
                </DetailField>
              )}
              {event.tableDimensions && (
                <DetailField label="Table dimensions">
                  {event.tableDimensions}
                </DetailField>
              )}
              {event.priceInfo && (
                <div className="sm:col-span-2">
                  <DetailField label="Price">{event.priceInfo}</DetailField>
                </div>
              )}
              {event.setupTime && (
                <DetailField label="Setup">{event.setupTime}</DetailField>
              )}
              {event.teardownTime && (
                <DetailField label="Teardown">
                  {event.teardownTime}
                </DetailField>
              )}
            </div>
          </Card>
        )}

        {amenityChips.length > 0 && (
          <Card className="p-6 md:p-8">
            <Overline>Provided amenities</Overline>
            <div className="mt-3 flex flex-wrap gap-2">
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

        {isAccepting && (
          <Card className="p-6 md:p-8">
            <Overline>Apply</Overline>
            <div className="mt-4">
              {isArtist ? (
                <ApplyButton
                  eventId={event.id}
                  hasExistingApplication={hasExistingApplication}
                  validationResult={validationResult}
                  guidelines={
                    event.guidelinesOverride ?? event.conventionGuidelines ?? null
                  }
                  fieldRequirements={event.fieldRequirements}
                  tableSizeOptions={event.tableSizeOptions ?? []}
                  maxAssistants={event.maxAssistants ?? 0}
                  assistantFeeNok={event.assistantFeeNok ?? null}
                />
              ) : session?.user ? (
                <p className="text-sm text-muted-foreground">
                  Only artist accounts can apply to events.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link
                    href="/login"
                    className="font-semibold text-primary underline underline-offset-4"
                  >
                    Log in
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/for-artists"
                    className="font-semibold text-primary underline underline-offset-4"
                  >
                    learn more
                  </Link>{" "}
                  about applying as an artist.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Right column — when & where, deadlines, etc. */}
      <aside className="space-y-4">
        <Card className="p-5">
          <Overline>When &amp; where</Overline>
          <div className="mt-3 space-y-3 text-[13.5px]">
            <div className="flex gap-2.5">
              <CalendarDays className="size-4 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-semibold">
                  {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
                </div>
                {(event.setupTime || event.teardownTime) && (
                  <div className="text-muted-foreground">
                    {event.setupTime && (
                      <span>Setup {event.setupTime}</span>
                    )}
                    {event.setupTime && event.teardownTime && " · "}
                    {event.teardownTime && (
                      <span>Teardown {event.teardownTime}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {(event.venueName || venueLine) && (
              <div className="flex gap-2.5">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  {event.venueName && (
                    <div className="font-semibold">{event.venueName}</div>
                  )}
                  {event.venueAddress && (
                    <div className="text-muted-foreground">
                      {event.venueAddress}
                    </div>
                  )}
                  {venueLine && (
                    <div className="text-muted-foreground">{venueLine}</div>
                  )}
                  {event.mapEmbedUrl && (
                    <a
                      href={event.mapEmbedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
                    >
                      Open in maps <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {event.availableStands && (
              <div className="flex gap-2.5">
                <Users className="size-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold">
                    {event.availableStands} stands
                  </div>
                  <div className="text-muted-foreground">artist alley</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {session?.user && event.applicationCloseDate && isAccepting && (
          <Card className="p-5">
            <Overline>Application deadline</Overline>
            <div className="mt-2 font-heading text-[20px] font-extrabold tracking-tight text-destructive">
              {formatDateNo(event.applicationCloseDate)}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Applications close at the end of this day.
            </p>
          </Card>
        )}
      </aside>
    </div>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}
