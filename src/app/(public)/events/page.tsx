import Link from "next/link";
import { MapPin, CalendarDays } from "lucide-react";
import { eq, ne, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { storage } from "@/lib/storage";
import { ARTIST_STATUS_LABELS } from "@/lib/events/status-display";
import { formatDateNo, formatDateRangeNo } from "@/lib/utils/format-date-no";

interface EventsPageProps {
  searchParams: Promise<{ convention?: string }>;
}

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { convention: filterConventionId } = await searchParams;

  const allEvents = await db
    .select({
      id: events.id,
      name: events.name,
      status: events.status,
      eventStartDate: events.eventStartDate,
      eventEndDate: events.eventEndDate,
      applicationOpenDate: events.applicationOpenDate,
      applicationCloseDate: events.applicationCloseDate,
      venueCity: events.venueCity,
      venueCountry: events.venueCountry,
      availableStands: events.availableStands,
      conventionId: events.conventionId,
      conventionName: conventions.name,
      conventionLogoPath: conventions.logoPath,
    })
    .from(events)
    .innerJoin(conventions, eq(conventions.id, events.conventionId))
    .where(ne(events.status, "draft"))
    .orderBy(
      asc(sql`COALESCE(${events.applicationCloseDate}, ${events.eventStartDate})`),
      asc(events.eventStartDate)
    );

  const conventionOptions = Array.from(
    new Map(
      allEvents.map((e) => [e.conventionId, e.conventionName])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filteredEvents = filterConventionId
    ? allEvents.filter((e) => e.conventionId === filterConventionId)
    : allEvents;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:px-8">
      <header className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Exhibition directory
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
          Open Events
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Curated selection of upcoming artist showcases and conventions.
        </p>
      </header>

      {conventionOptions.length > 1 && (
        <div
          className="mb-8 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Convention filter"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Filter
          </span>
          <Link href="/events">
            <Badge variant={!filterConventionId ? "default" : "outline"}>
              All
            </Badge>
          </Link>
          {conventionOptions.map(([id, name]) => (
            <Link key={id} href={`/events?convention=${id}`}>
              <Badge
                variant={filterConventionId === id ? "default" : "outline"}
              >
                {name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No events to show right now.
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event) => {
            const statusInfo = ARTIST_STATUS_LABELS[event.status] ?? {
              label: event.status,
              variant: "outline" as const,
            };
            const logoUrl = event.conventionLogoPath
              ? storage.getUrl(event.conventionLogoPath)
              : null;

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block"
              >
                <Card
                  interactive
                  className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8"
                >
                  <Avatar className="size-16 rounded-2xl md:size-20">
                    {logoUrl && <AvatarImage src={logoUrl} alt="" />}
                    <AvatarFallback className="rounded-2xl bg-secondary text-sm font-semibold">
                      {conventionInitials(event.conventionName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {event.conventionName}
                    </p>
                    <h2 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
                      {event.name}
                    </h2>
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
                      {event.availableStands && (
                        <span>{event.availableStands} stands</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                    {event.status === "accepting_applications" &&
                      event.applicationCloseDate && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Deadline
                          </p>
                          <p className="font-heading text-base font-bold text-destructive">
                            {formatDateNo(event.applicationCloseDate)}
                          </p>
                        </div>
                      )}
                    {event.status === "published" &&
                      event.applicationOpenDate && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Opens
                          </p>
                          <p className="font-heading text-base font-bold">
                            {formatDateNo(event.applicationOpenDate)}
                          </p>
                        </div>
                      )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
