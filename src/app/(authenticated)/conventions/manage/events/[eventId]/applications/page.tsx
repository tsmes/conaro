import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { Card } from "@/components/ui/card";

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
    (a) =>
      a.status !== "accepted" &&
      a.status !== "rejected" &&
      a.status !== "revoked"
  ).length;

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
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/conventions/manage/events/${event.id}`}
              className="inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              Back to event
            </Link>
          }
        />
      </div>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          {event.name}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Review applications
        </h1>
        <p className="mt-3 text-muted-foreground">
          {applicants.length} application{applicants.length === 1 ? "" : "s"} in
          the pile.
        </p>
      </header>

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Response templates
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold tracking-tight">
          Default acceptance &amp; rejection messages
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These are the defaults each applicant receives. Individual messages
          can override them from the single-applicant view.
        </p>
        <div className="mt-8">
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
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            Applicants
          </h2>
          <PublishResultsButton
            eventId={event.id}
            eventStatus={event.status}
            undecidedCount={undecidedCount}
            totalCount={applicants.length}
          />
        </div>
        <ApplicantList
          eventId={event.id}
          eventStatus={event.status}
          applicants={applicants}
        />
      </section>
    </div>
  );
}
