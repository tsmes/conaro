import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import {
  updateEvent,
  openApplications,
  closeApplications,
} from "@/app/conventions/manage/events/actions";
import { EventForm } from "@/components/conventions/event-form";
import { EventStatusControls } from "@/components/conventions/event-status-controls";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  if (!event) {
    notFound();
  }

  const amenities = event.amenities as {
    electricity?: boolean;
    wifi?: boolean;
    tables?: boolean;
    chairs?: boolean;
    other?: string;
  } | null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/conventions/manage">
          <Button variant="ghost" size="sm">
            &larr; Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{event.name}</h1>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <EventStatusControls
          eventId={event.id}
          currentStatus={event.status}
          openAction={openApplications}
          closeAction={closeApplications}
        />

        <Link href={`/conventions/manage/events/${event.id}/fields`}>
          <Button variant="outline" size="sm">
            Field Configuration
          </Button>
        </Link>
      </div>

      <Separator className="my-6" />

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
        }}
        submitLabel="Save Changes"
      />
    </div>
  );
}
