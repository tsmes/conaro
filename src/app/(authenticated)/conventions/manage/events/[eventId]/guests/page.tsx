import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { GuestsEditor } from "@/components/conventions/guests-editor";
import { storage } from "@/lib/storage";

interface GuestsManagePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function GuestsManagePage({
  params,
}: GuestsManagePageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) notFound();

  const guests = event.guests ?? [];
  const guestImageUrls: Record<string, string> = {};
  for (const guest of guests) {
    if (guest.imagePath) {
      guestImageUrls[guest.imagePath] = storage.getUrl(guest.imagePath);
    }
  }

  return (
    <GuestsEditor
      eventId={event.id}
      initialGuests={guests}
      guestImageUrls={guestImageUrls}
    />
  );
}
