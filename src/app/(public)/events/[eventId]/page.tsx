import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";

import { getEventViewerContext } from "@/lib/events/event-context";
import { ApplicantContext } from "@/components/events/applicant-context";
import { ApplyButton } from "@/components/events/apply-button";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import {
  formatDateNo,
  formatDateRangeNo,
} from "@/lib/utils/format-date-no";

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

export default async function EventOverviewPage({
  params,
}: EventDetailPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);
  const { event, session, isArtist, hasExistingApplication, validationResult } =
    ctx;

  const isAccepting = event.status === "accepting_applications";
  const venueLine = [event.venueCity, event.venueCountry]
    .filter(Boolean)
    .join(", ");

  // Fallback applicant context for viewers who can't reach the
  // Messages tab (rejected / waitlisted artists). Accepted artists
  // see the same block on /messages instead, so we don't double up.
  const showApplicantFallback =
    ctx.ownApplicationStatus === "rejected" ||
    ctx.ownApplicationStatus === "waitlisted";
  const applicantFallback = showApplicantFallback ? (
    <ApplicantContext
      status={ctx.ownApplicationStatus!}
      responseMessage={ctx.ownResponseMessage}
      eventId={event.id}
      hasAssignedTable={false}
      waitlistEnabled={event.waitlistEnabled ?? false}
    />
  ) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        {applicantFallback}
        {event.description && (
          <Card className="p-6 md:p-8">
            <Overline>About this event</Overline>
            <div className="mt-3">
              <Markdown
                source={event.description}
                className="text-foreground"
              />
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

      {/* Right rail — quick facts */}
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
              </div>
            </div>
            {(event.venueName || venueLine) && (
              <div className="flex gap-2.5">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  {event.venueName && (
                    <div className="font-semibold">{event.venueName}</div>
                  )}
                  {venueLine && (
                    <div className="text-muted-foreground">{venueLine}</div>
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
