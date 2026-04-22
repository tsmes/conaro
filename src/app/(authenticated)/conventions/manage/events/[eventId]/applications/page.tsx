import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import {
  getEventApplicants,
  getOrganizerConvention,
  getOrganizerEvent,
} from "@/lib/conventions/queries";
import type { SelectionApplicant } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { PublishResultsButton } from "@/components/conventions/publish-results-button";
import { ResponseTemplatesForm } from "@/components/conventions/response-templates-form";
import { SelectionWorkspace } from "@/components/conventions/selection/selection-workspace";
import type { SelectionApplicantView } from "@/components/conventions/selection/types";
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

  const applicants = await getEventApplicants(session.user.profileId, eventId);

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
      and(eq(events.conventionId, convention.id), ne(events.id, eventId))
    );

  const isPublished = event.status === "results_published";

  const tableSizeMap = new Map(
    (event.tableSizeOptions ?? []).map((o) => [o.id, o])
  );

  const applicantsView: SelectionApplicantView[] = applicants.map(
    (app: SelectionApplicant) => {
      const ans = app.answers;
      const tableSize = ans.tableSizeOptionId
        ? tableSizeMap.get(ans.tableSizeOptionId) ?? null
        : null;
      return {
        id: app.id,
        profileId: app.profileId,
        status: app.status,
        pinned: app.pinned,
        paymentConfirmed: app.paymentConfirmed,
        createdAt: app.createdAt,
        displayName: app.snapshot.displayName,
        bio: app.snapshot.bio,
        helpers: app.snapshot.helpers,
        accessibilityNeeds: app.snapshot.accessibilityNeeds,
        genres: app.snapshot.genres ?? [],
        mediums: app.snapshot.mediums ?? [],
        images: [...app.snapshot.images]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => ({
            id: image.id,
            url: storage.getUrl(image.storagePath),
            sortOrder: image.sortOrder,
          })),
        answers: {
          tableSizeLabel: tableSize?.label ?? null,
          tableSizeDimensions: tableSize?.dimensions ?? null,
          tableSizePriceNok: tableSize?.priceNok ?? null,
          assistantsCount: ans.assistants?.count ?? null,
          assistantsNames: ans.assistants?.names ?? [],
          sharingStand: ans.sharingStand
            ? {
                sharing: ans.sharingStand.sharing,
                with: ans.sharingStand.with ?? null,
              }
            : null,
          placementPreference: ans.placementPreference ?? null,
          additionalComments: ans.additionalComments ?? null,
          promotionConsent: ans.promotionConsent ?? null,
          guidelinesAcknowledgedAt: app.guidelinesAcknowledgedAt,
        },
      };
    }
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-10 md:px-8">
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

      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Selection · {event.name}
        </p>
        <h1 className="font-heading text-display-md font-extrabold leading-[1.05] tracking-tight">
          {event.status === "accepting_applications"
            ? "Incoming applications"
            : "Pick your artists"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {applicants.length === 0
            ? "No applicants yet. Once artists submit, you'll see them here."
            : event.status === "accepting_applications"
              ? `${applicants.length} artist${applicants.length === 1 ? " has" : "s have"} applied so far. Close applications to start the selection round.`
              : `${undecidedCount} still undecided. Pin favourites as you browse; accept when you're ready.`}
        </p>
      </header>

      {event.status === "reviewing" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <PublishResultsButton
            eventId={event.id}
            eventStatus={event.status}
            undecidedCount={undecidedCount}
            totalCount={applicants.length}
          />
        </div>
      )}

      <SelectionWorkspace
        eventId={event.id}
        eventStatus={event.status}
        availableStands={event.availableStands}
        applicants={applicantsView}
      />

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Response templates
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold tracking-tight">
          Default acceptance &amp; rejection messages
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These are the defaults each applicant receives. Override them per
          applicant from Deep review if needed.
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
    </div>
  );
}
