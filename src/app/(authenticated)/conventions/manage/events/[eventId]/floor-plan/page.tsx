import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import {
  getAcceptedArtistsForEvent,
  getFloorPlanForEvent,
} from "@/lib/floor-plans/queries";
import { FloorPlanEditor } from "@/components/floor-plans/floor-plan-editor";

interface FloorPlanPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function FloorPlanPage({
  params,
}: FloorPlanPageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) notFound();

  const [floorPlan, acceptedArtists] = await Promise.all([
    getFloorPlanForEvent(event.id),
    getAcceptedArtistsForEvent(event.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Floor plan
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Layout &amp; table assignments
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add rooms for your venue, place tables in each room, then assign
          accepted artists. Sizes use the table-size catalog from the event
          details; fill in width/depth on any size you want to place here.
        </p>
      </div>
      <FloorPlanEditor
        eventId={event.id}
        initialPlan={floorPlan}
        tableSizeOptions={event.tableSizeOptions ?? []}
        acceptedArtists={acceptedArtists}
      />
    </div>
  );
}
