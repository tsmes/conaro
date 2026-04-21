import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Users, CalendarDays, MapPin } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ORGANIZER_STATUS_LABELS } from "@/lib/events/status-display";
import { formatDateRangeNo } from "@/lib/utils/format-date-no";

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function ConventionManagePage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    redirect("/login");
  }

  const eventList = await db
    .select()
    .from(events)
    .where(eq(events.conventionId, convention.id))
    .orderBy(desc(events.createdAt));

  const logoUrl = convention.logoPath
    ? storage.getUrl(convention.logoPath)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-10 md:px-8">
      <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar className="size-16 rounded-2xl">
            {logoUrl && <AvatarImage src={logoUrl} alt="" />}
            <AvatarFallback className="rounded-2xl bg-primary-container text-on-primary-container text-sm font-semibold">
              {conventionInitials(convention.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Current workspace
            </p>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
              {convention.name}
            </h1>
            <Link
              href="/conventions/manage/edit"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
            >
              <Pencil className="size-3" />
              Edit convention
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href="/conventions/manage/lists"
                className="inline-flex items-center gap-1.5"
              >
                <Users className="size-4" />
                Manage lists
              </Link>
            }
          />
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link
                href="/conventions/manage/events/new"
                className="inline-flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                Create event
              </Link>
            }
          />
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Events
        </h2>

        {eventList.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-heading text-lg font-semibold">
              No events yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Create your first event to start collecting applications from
              artists.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                nativeButton={false}
                render={
                  <Link
                    href="/conventions/manage/events/new"
                    className="inline-flex items-center gap-1.5"
                  >
                    <Plus className="size-4" />
                    Create event
                  </Link>
                }
              />
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {eventList.map((event) => {
              const statusInfo = ORGANIZER_STATUS_LABELS[event.status] ?? {
                label: event.status,
                variant: "outline" as const,
              };

              return (
                <Link
                  key={event.id}
                  href={`/conventions/manage/events/${event.id}`}
                  className="block"
                >
                  <Card
                    interactive
                    className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8"
                  >
                    <div className="space-y-2">
                      <h3 className="font-heading text-xl font-bold tracking-tight">
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
                        {event.availableStands && (
                          <span>{event.availableStands} stands</span>
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
