import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  getCachedFloorPlan,
  getEventViewerContext,
  shouldShowFloorPlanTab,
  shouldShowMessagesTab,
} from "@/lib/events/event-context";
import { storage } from "@/lib/storage";
import { getEventAnnouncements } from "@/lib/events/announcements";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { FollowButton } from "@/components/conventions/follow-button";
import { ApplicationStatusCard } from "@/components/events/application-status-card";
import { ArtistEventTabsNav } from "@/components/events/artist-event-tabs-nav";
import { JoinWaitlistButton } from "@/components/events/join-waitlist-button";
import { formatDateNo } from "@/lib/utils/format-date-no";
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
    isArtist,
    isFollowingConvention,
    ownApplicationStatus,
    ownApplicationId,
    ownResponseMessage,
    isAcceptedToEvent,
  } = ctx;

  const conventionLogoUrl = event.conventionLogoPath
    ? storage.getUrl(event.conventionLogoPath)
    : null;

  const announcements = isAcceptedToEvent
    ? await getEventAnnouncements(event.id)
    : [];

  const [showFloorPlan, showMessages] = await Promise.all([
    shouldShowFloorPlanTab(ctx),
    shouldShowMessagesTab(ctx),
  ]);

  // Reuses the cached floor plan (already loaded by shouldShowFloorPlanTab
  // when applicable) to decide whether to surface the "Show me my table"
  // button on the status card.
  const hasAssignedTable = await (async () => {
    if (!isAcceptedToEvent || !ownApplicationId || !showFloorPlan) return false;
    const plan = await getCachedFloorPlan(event.id);
    return Boolean(
      plan?.tables.some(
        (t) => t.assignment?.applicationId === ownApplicationId
      )
    );
  })();

  const showStatusCard =
    isArtist &&
    event.status === "results_published" &&
    ownApplicationStatus &&
    ownApplicationStatus !== "revoked";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/events">
              <ArrowLeft className="size-4" />
              All events
            </Link>
          }
        />
      </div>

      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <Link
            href={`/conventions/${event.conventionId}`}
            className="group/conv inline-flex items-center gap-3"
          >
            <Avatar className="size-10 rounded-lg">
              {conventionLogoUrl && (
                <AvatarImage src={conventionLogoUrl} alt="" />
              )}
              <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold">
                {conventionInitials(event.conventionName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover/conv:text-primary">
              {event.conventionName}
            </span>
          </Link>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-5xl">
            {event.name}
          </h1>
          {event.status === "published" && event.applicationOpenDate && (
            <Badge variant="outline">
              Applications open {formatDateNo(event.applicationOpenDate)}
            </Badge>
          )}
          {event.status === "reviewing" && (
            <Badge variant="secondary">Applications under review</Badge>
          )}
          {event.status === "results_published" &&
            (ownApplicationStatus === "accepted" ? (
              <Badge variant="success">Accepted</Badge>
            ) : ownApplicationStatus === "waitlisted" ? (
              <Badge variant="warning">Waitlisted</Badge>
            ) : ownApplicationStatus === "rejected" ? (
              <Badge variant="destructive">Not selected</Badge>
            ) : ownApplicationStatus === "revoked" ? (
              <Badge variant="outline">Revoked</Badge>
            ) : (
              <Badge variant="success">Results published</Badge>
            ))}
        </div>
        {isArtist && (
          <FollowButton
            conventionId={event.conventionId}
            isFollowing={isFollowingConvention}
          />
        )}
      </header>

      {isAcceptedToEvent && announcements.length > 0 && (
        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Organizer updates
            </p>
            <span className="font-mono text-[11px] text-muted-foreground">
              {announcements.length}
            </span>
          </div>
          <div className="space-y-3">
            {announcements.map((a) => {
              const edited =
                a.updatedAt.getTime() - a.createdAt.getTime() > 1000;
              return (
                <Card key={a.id} className="p-5">
                  <h3 className="font-heading text-lg font-bold leading-tight">
                    {a.subject}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {formatDateNo(a.createdAt.toISOString().slice(0, 10))}
                    {edited && " · edited"}
                  </p>
                  <Markdown source={a.body} className="mt-3 text-foreground" />
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {showStatusCard && ownApplicationStatus && (
        <div className="mt-10">
          <ApplicationStatusCard
            status={ownApplicationStatus}
            responseMessage={ownResponseMessage}
            eventId={event.id}
            hasAssignedTable={hasAssignedTable}
          >
            {ownApplicationStatus === "rejected" &&
              event.waitlistEnabled && (
                <div
                  className={cn(
                    "mt-5",
                    ownResponseMessage && "border-t border-border pt-5"
                  )}
                >
                  <p className="mb-3 text-sm text-muted-foreground">
                    If a spot opens up, the organizer may offer it to you —
                    join the waitlist to opt in.
                  </p>
                  <JoinWaitlistButton eventId={event.id} />
                </div>
              )}
          </ApplicationStatusCard>
        </div>
      )}

      <div className="mt-10">
        <ArtistEventTabsNav
          eventId={event.id}
          showFloorPlan={showFloorPlan}
          showMessages={showMessages}
        />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
