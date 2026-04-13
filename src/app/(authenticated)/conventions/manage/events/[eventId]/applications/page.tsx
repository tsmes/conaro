import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import type { ProfileSnapshot } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { getOrganizerEvent, getOrganizerConvention } from "@/lib/conventions/queries";
import { ApplicantList } from "@/components/conventions/applicant-list";
import { PublishResultsButton } from "@/components/conventions/publish-results-button";
import { ResponseTemplatesForm } from "@/components/conventions/response-templates-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ApplicationsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ApplicationsPage({
  params,
}: ApplicationsPageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    notFound();
  }

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    redirect("/login");
  }

  // Fetch applications + allow/block list status
  const appRows = await db
    .select({
      id: applications.id,
      profileId: applications.profileId,
      status: applications.status,
      paymentConfirmed: applications.paymentConfirmed,
      profileSnapshot: applications.profileSnapshot,
      isBlockListed: applications.isBlockListed,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .where(eq(applications.eventId, eventId));

  // Fetch allow-list entries for this convention
  const allowEntries = await db
    .select({ profileId: conventionArtistLists.profileId })
    .from(conventionArtistLists)
    .where(
      and(
        eq(conventionArtistLists.conventionId, convention.id),
        eq(conventionArtistLists.listType, "allow")
      )
    );

  const allowSet = new Set(allowEntries.map((e) => e.profileId));

  const applicants = appRows.map((app) => {
    const snapshot = app.profileSnapshot as ProfileSnapshot;
    return {
      id: app.id,
      profileId: app.profileId,
      displayName: snapshot.displayName,
      status: app.status,
      paymentConfirmed: app.paymentConfirmed,
      createdAt: app.createdAt,
      isAllowListed: allowSet.has(app.profileId),
      isBlockListed: app.isBlockListed,
    };
  });

  const undecidedCount = applicants.filter(
    (a) => a.status !== "accepted" && a.status !== "rejected" && a.status !== "revoked"
  ).length;

  // Fetch other events for template copy
  const otherEvents = await db
    .select({
      id: events.id,
      name: events.name,
      acceptanceMessage: events.acceptanceMessage,
      rejectionMessage: events.rejectionMessage,
    })
    .from(events)
    .where(
      and(
        eq(events.conventionId, convention.id),
        ne(events.id, eventId)
      )
    );

  const isPublished = event.status === "results_published";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href={`/conventions/manage/events/${event.id}`}>
          <Button variant="ghost" size="sm">
            &larr; Back to Event
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Applications</h1>
      </div>
      <p className="mt-1 text-muted-foreground">
        {event.name} &mdash; {applicants.length} application(s)
      </p>

      <Separator className="my-6" />

      <ResponseTemplatesForm
        eventId={event.id}
        acceptanceMessage={event.acceptanceMessage ?? ""}
        rejectionMessage={event.rejectionMessage ?? ""}
        otherEvents={otherEvents.map((e) => ({
          ...e,
          acceptanceMessage: e.acceptanceMessage,
          rejectionMessage: e.rejectionMessage,
        }))}
        readOnly={isPublished}
      />

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Applicants</h2>
        <PublishResultsButton
          eventId={event.id}
          eventStatus={event.status}
          undecidedCount={undecidedCount}
          totalCount={applicants.length}
        />
      </div>

      <div className="mt-4">
        <ApplicantList
          eventId={event.id}
          eventStatus={event.status}
          applicants={applicants}
        />
      </div>
    </div>
  );
}
