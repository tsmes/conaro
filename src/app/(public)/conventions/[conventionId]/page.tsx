import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, CalendarDays, MapPin } from "lucide-react";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { storage } from "@/lib/storage";
import { FollowButton } from "@/components/conventions/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ARTIST_STATUS_LABELS } from "@/lib/events/status-display";
import { formatDateNo, formatDateRangeNo } from "@/lib/utils/format-date-no";

interface ConventionDetailPageProps {
  params: Promise<{ conventionId: string }>;
}

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function ConventionDetailPage({
  params,
}: ConventionDetailPageProps) {
  const { conventionId } = await params;

  const [convention] = await db
    .select()
    .from(conventions)
    .where(eq(conventions.id, conventionId));

  if (!convention) {
    notFound();
  }

  const logoUrl = convention.logoPath
    ? storage.getUrl(convention.logoPath)
    : null;

  const session = await auth();
  const isArtist =
    session?.user?.profileId && session.user.role === "artist";

  const [openEvents, followResult] = await Promise.all([
    db
      .select({
        id: events.id,
        name: events.name,
        status: events.status,
        eventStartDate: events.eventStartDate,
        eventEndDate: events.eventEndDate,
        venueCity: events.venueCity,
        venueCountry: events.venueCountry,
        applicationOpenDate: events.applicationOpenDate,
        applicationCloseDate: events.applicationCloseDate,
      })
      .from(events)
      .where(
        and(
          eq(events.conventionId, conventionId),
          ne(events.status, "draft")
        )
      ),
    isArtist
      ? db
          .select({ id: conventionFollows.id })
          .from(conventionFollows)
          .where(
            and(
              eq(conventionFollows.profileId, session.user.profileId!),
              eq(conventionFollows.conventionId, conventionId)
            )
          )
      : Promise.resolve([]),
  ]);

  const isFollowing = followResult.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/conventions">
              <ArrowLeft className="size-4" />
              All conventions
            </Link>
          }
        />
      </div>

      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar className="size-20 rounded-3xl">
            {logoUrl && <AvatarImage src={logoUrl} alt="" />}
            <AvatarFallback className="rounded-3xl bg-secondary text-lg font-semibold">
              {conventionInitials(convention.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Convention
            </p>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
              {convention.name}
            </h1>
            {convention.websiteUrl && (
              <a
                href={convention.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
              >
                Website
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
        {isArtist && (
          <FollowButton
            conventionId={conventionId}
            isFollowing={isFollowing}
          />
        )}
      </header>

      {convention.description && (
        <Card className="mt-8 p-6">
          <p className="whitespace-pre-line leading-relaxed text-foreground">
            {convention.description}
          </p>
        </Card>
      )}

      <section className="mt-12 space-y-4">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Events
        </h2>

        {openEvents.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No events to show.
          </Card>
        ) : (
          <div className="space-y-4">
            {openEvents.map((event) => {
              const statusInfo = ARTIST_STATUS_LABELS[event.status] ?? {
                label: event.status,
                variant: "outline" as const,
              };

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block"
                >
                  <Card
                    interactive
                    className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-2">
                      <h3 className="font-heading text-lg font-bold tracking-tight">
                        {event.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-4" />
                          {formatDateRangeNo(
                            event.eventStartDate,
                            event.eventEndDate
                          )}
                        </span>
                        {(event.venueCity || event.venueCountry) && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-4" />
                            {[event.venueCity, event.venueCountry]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {event.status === "published" &&
                          event.applicationOpenDate && (
                            <span>
                              Opens {formatDateNo(event.applicationOpenDate)}
                            </span>
                          )}
                        {event.status === "accepting_applications" &&
                          event.applicationCloseDate && (
                            <span className="font-semibold text-destructive">
                              Deadline{" "}
                              {formatDateNo(event.applicationCloseDate)}
                            </span>
                          )}
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
