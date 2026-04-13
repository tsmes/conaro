import Link from "next/link";
import { eq, ne, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ARTIST_STATUS_LABELS } from "@/lib/events/status-display";

interface EventsPageProps {
  searchParams: Promise<{ convention?: string }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { convention: filterConventionId } = await searchParams;

  // Fetch all non-draft events with convention info
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
    })
    .from(events)
    .innerJoin(conventions, eq(conventions.id, events.conventionId))
    .where(ne(events.status, "draft"))
    .orderBy(
      asc(sql`COALESCE(${events.applicationCloseDate}, ${events.eventStartDate})`),
      asc(events.eventStartDate)
    );

  // Build convention filter options from visible events
  const conventionOptions = Array.from(
    new Map(
      allEvents.map((e) => [e.conventionId, e.conventionName])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // Apply filter
  const filteredEvents = filterConventionId
    ? allEvents.filter((e) => e.conventionId === filterConventionId)
    : allEvents;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Events</h1>
      <p className="mt-2 text-muted-foreground">
        Browse upcoming and open events.
      </p>

      {conventionOptions.length > 1 && (
        <div
          className="mt-4 flex items-center gap-2"
          role="group"
          aria-label="Convention filter"
        >
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex flex-wrap gap-2">
            <Link href="/events">
              <Badge variant={!filterConventionId ? "default" : "secondary"}>
                All
              </Badge>
            </Link>
            {conventionOptions.map(([id, name]) => (
              <Link key={id} href={`/events?convention=${id}`}>
                <Badge
                  variant={filterConventionId === id ? "default" : "secondary"}
                >
                  {name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <div className="mt-8 text-center text-muted-foreground">
          No events to show.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const statusInfo = ARTIST_STATUS_LABELS[event.status] ?? {
              label: event.status,
              variant: "secondary" as const,
            };

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block"
              >
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {event.conventionName}
                      </p>
                      <Badge variant={statusInfo.variant} className="text-xs">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <CardDescription className="space-y-1">
                      <span className="block">
                        {event.eventStartDate}
                        {event.eventEndDate && ` — ${event.eventEndDate}`}
                      </span>
                      {(event.venueCity || event.venueCountry) && (
                        <span className="block">
                          {[event.venueCity, event.venueCountry]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        {event.availableStands && (
                          <span>{event.availableStands} stands</span>
                        )}
                        {event.status === "published" &&
                          event.applicationOpenDate && (
                            <span className="text-xs">
                              Opens: {event.applicationOpenDate}
                            </span>
                          )}
                        {event.status === "accepting_applications" &&
                          event.applicationCloseDate && (
                            <span className="text-xs">
                              Deadline: {event.applicationCloseDate}
                            </span>
                          )}
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
