import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getEventApplicants,
  getOrganizerConvention,
  getOrganizerEvent,
} from "@/lib/conventions/queries";
import type { SelectionApplicant } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { PublishResultsButton } from "@/components/conventions/publish-results-button";
import { SelectionWorkspace } from "@/components/conventions/selection/selection-workspace";
import type { SelectionApplicantView } from "@/components/conventions/selection/types";

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
  const convention = await getOrganizerConvention(session.user.profileId);
  if (!event || !convention) {
    notFound();
  }

  const applicants = await getEventApplicants(session.user.profileId, eventId);

  const undecidedCount = applicants.filter(
    (a) =>
      a.status !== "accepted" &&
      a.status !== "rejected" &&
      a.status !== "revoked"
  ).length;
  const acceptedCount = applicants.filter((a) => a.status === "accepted").length;

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
            width: image.width,
            height: image.height,
            sortOrder: image.sortOrder,
            caption: image.caption ?? null,
          })),
        answers: {
          tableSizeLabel: tableSize?.label ?? null,
          tableSizeDimensions:
            tableSize?.widthCm && tableSize?.depthCm
              ? `${tableSize.widthCm} × ${tableSize.depthCm} cm`
              : null,
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
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          {applicants.length === 0 ? "No applicants yet" : "Pick your artists"}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {applicants.length === 0
            ? "Once artists submit, you'll see them here."
            : event.status === "accepting_applications"
              ? `${applicants.length} application${applicants.length === 1 ? "" : "s"} so far. Accept, reject, or pin as they come in — applications are still open.`
              : `${undecidedCount} still undecided. Pin favourites as you browse; accept when you're ready.`}
        </p>
      </header>

      {event.status === "reviewing" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <PublishResultsButton
            eventId={event.id}
            eventStatus={event.status}
            undecidedCount={undecidedCount}
            acceptedCount={acceptedCount}
            totalCount={applicants.length}
            availableStands={event.availableStands}
          />
        </div>
      )}

      <SelectionWorkspace
        eventId={event.id}
        eventStatus={event.status}
        availableStands={event.availableStands}
        applicants={applicantsView}
        waitlistEnabled={convention.waitlistEnabled}
      />
    </div>
  );
}
