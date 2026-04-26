import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Sliders } from "lucide-react";
import { auth } from "@/lib/auth";
import type { Amenities } from "@/lib/db/schema/events";
import {
  getOrganizerConvention,
  getOrganizerEvent,
} from "@/lib/conventions/queries";
import {
  updateEvent,
  openApplications,
  closeApplications,
  publishEvent,
} from "@/app/(authenticated)/conventions/manage/events/actions";
import { EventForm } from "@/components/conventions/event-form";
import { EventStatusControls } from "@/components/conventions/event-status-controls";
import { BannerUpload } from "@/components/conventions/banner-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { storage } from "@/lib/storage";

interface EventDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
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

  const amenities = event.amenities as Amenities | null;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <Card className="p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Lifecycle
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <EventStatusControls
            eventId={event.id}
            currentStatus={event.status}
            publishAction={publishEvent}
            openAction={openApplications}
            closeAction={closeApplications}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/conventions/manage/events/${event.id}/fields`}>
                <Sliders className="size-4" />
                Field configuration
              </Link>
            }
          />
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Banner
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold tracking-tight">
          Hero banner
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional — overrides the convention default on the public event page.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Desktop
            </p>
            <div className="mt-3">
              <BannerUpload
                endpoint={`/api/events/${event.id}/banner`}
                currentBannerUrl={
                  event.bannerPath ? storage.getUrl(event.bannerPath) : null
                }
                altLabel={`${event.name} banner`}
                previewAspectClass="aspect-[4/1]"
                hint="Wide hero — JPEG, PNG, WebP, or AVIF. Max 8 MB. 4:1 works best."
                placeholderHint="No event banner — falls back to the convention default, then to the gradient."
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Mobile
            </p>
            <div className="mt-3">
              <BannerUpload
                endpoint={`/api/events/${event.id}/banner-mobile`}
                currentBannerUrl={
                  event.bannerMobilePath
                    ? storage.getUrl(event.bannerMobilePath)
                    : null
                }
                altLabel={`${event.name} mobile banner`}
                previewAspectClass="aspect-[16/9]"
                hint="Optional — used for the mobile top strip. Falls back to the desktop banner if unset. Square or 16:9 reads best."
                placeholderHint="No mobile banner — the desktop banner is shown on phones."
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Details
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Edit event details
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Save changes anytime. Artists see the latest version on the public
          event page.
        </p>
        <div className="mt-8">
          <EventForm
            action={updateEvent}
            defaultValues={{
              eventId: event.id,
              name: event.name,
              description: event.description ?? "",
              eventStartDate: event.eventStartDate,
              eventEndDate: event.eventEndDate ?? "",
              applicationOpenDate: event.applicationOpenDate ?? "",
              applicationCloseDate: event.applicationCloseDate ?? "",
              venueName: event.venueName ?? "",
              venueAddress: event.venueAddress ?? "",
              venueCity: event.venueCity ?? "",
              venueCountry: event.venueCountry ?? "",
              mapEmbedUrl: event.mapEmbedUrl ?? "",
              availableStands: event.availableStands,
              tableDimensions: event.tableDimensions ?? "",
              priceInfo: event.priceInfo ?? "",
              setupTime: event.setupTime ?? "",
              teardownTime: event.teardownTime ?? "",
              amenities_electricity: amenities?.electricity ?? false,
              amenities_wifi: amenities?.wifi ?? false,
              amenities_tables: amenities?.tables ?? false,
              amenities_chairs: amenities?.chairs ?? false,
              amenities_other: amenities?.other ?? "",
              guidelinesOverride: event.guidelinesOverride ?? "",
              tableSizeOptions: event.tableSizeOptions ?? [],
              maxAssistants: event.maxAssistants ?? 0,
              assistantFeeNok: event.assistantFeeNok ?? null,
              acceptanceMessage: event.acceptanceMessage ?? "",
              rejectionMessage: event.rejectionMessage ?? "",
              conventionAcceptanceMessage: convention.acceptanceMessage,
              conventionRejectionMessage: convention.rejectionMessage,
              conventionName: convention.name,
              organizerName: session.user.name ?? undefined,
            }}
            submitLabel="Save changes"
          />
        </div>
      </Card>
    </div>
  );
}
