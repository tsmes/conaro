import Link from "next/link";

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

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 md:p-8">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </Card>
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
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
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

  return (
    <div className="space-y-6">
      {event.description && (
        <SectionCard label="About this event">
          <Markdown
            source={event.description}
            className="text-muted-foreground"
          />
        </SectionCard>
      )}

      <SectionCard label="Dates">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Event">
            {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
          </DetailField>
          {event.applicationCloseDate && (
            <DetailField label="Application deadline">
              <span className="font-semibold text-destructive">
                {formatDateNo(event.applicationCloseDate)}
              </span>
            </DetailField>
          )}
        </div>
      </SectionCard>

      {(event.venueName || event.venueCity) && (
        <SectionCard label="Location">
          <div className="space-y-1 text-sm">
            {event.venueName && (
              <p className="font-heading text-base font-bold">
                {event.venueName}
              </p>
            )}
            {event.venueAddress && <p>{event.venueAddress}</p>}
            {(event.venueCity || event.venueCountry) && (
              <p className="text-muted-foreground">
                {[event.venueCity, event.venueCountry]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {session?.user &&
        (event.availableStands ||
          event.tableDimensions ||
          event.priceInfo) && (
          <SectionCard label="Artist Logistics">
            <div className="grid gap-4 sm:grid-cols-2">
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
          </SectionCard>
        )}

      {session?.user && amenities && (
        <SectionCard label="Provided Amenities">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {amenities.electricity && (
                <Badge variant="outline">Electricity</Badge>
              )}
              {amenities.wifi && <Badge variant="outline">Wi-Fi</Badge>}
              {amenities.tables && <Badge variant="outline">Tables</Badge>}
              {amenities.chairs && <Badge variant="outline">Chairs</Badge>}
            </div>
            {amenities.other && (
              <p className="text-sm text-muted-foreground">{amenities.other}</p>
            )}
          </div>
        </SectionCard>
      )}

      {event.conventionDescription && (
        <SectionCard label="About the convention">
          <Markdown
            source={event.conventionDescription}
            className="text-muted-foreground"
          />
        </SectionCard>
      )}

      {isAccepting && (
        <SectionCard label="Apply">
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
                href="/register"
                className="font-semibold text-primary underline underline-offset-4"
              >
                register
              </Link>{" "}
              as an artist to apply.
            </p>
          )}
        </SectionCard>
      )}
    </div>
  );
}
