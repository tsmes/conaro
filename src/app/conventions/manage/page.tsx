import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  accepting_applications: { label: "Accepting Applications", variant: "default" },
  reviewing: { label: "Reviewing", variant: "outline" },
  results_published: { label: "Results Published", variant: "default" },
};

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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{convention.name}</h1>
          {convention.description && (
            <p className="mt-1 text-muted-foreground line-clamp-2">
              {convention.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/conventions/manage/edit">
            <Button variant="outline" size="sm">
              Edit Convention
            </Button>
          </Link>
          <Link href="/conventions/manage/lists">
            <Button variant="outline" size="sm">
              Manage Lists
            </Button>
          </Link>
        </div>
      </div>

      {logoUrl && (
        <div className="mt-4">
          <img
            src={logoUrl}
            alt={`${convention.name} logo`}
            className="h-24 w-auto rounded-lg object-contain"
          />
        </div>
      )}

      <Separator className="my-6" />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Events</h2>
        <Link href="/conventions/manage/events/new">
          <Button size="sm">Create Event</Button>
        </Link>
      </div>

      {eventList.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-muted-foreground">
            No events yet. Create your first event to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {eventList.map((event) => {
            const statusInfo = STATUS_LABELS[event.status] ?? {
              label: event.status,
              variant: "secondary" as const,
            };

            return (
              <Link
                key={event.id}
                href={`/conventions/manage/events/${event.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <CardDescription>
                      {event.eventStartDate}
                      {event.eventEndDate && ` — ${event.eventEndDate}`}
                      {event.venueCity && ` · ${event.venueCity}`}
                      {event.venueCountry && `, ${event.venueCountry}`}
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
