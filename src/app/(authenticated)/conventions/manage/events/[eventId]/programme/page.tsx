import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { ProgrammeEditor } from "@/components/conventions/programme-editor";

interface ProgrammeManagePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ProgrammeManagePage({
  params,
}: ProgrammeManagePageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) notFound();

  return (
    <ProgrammeEditor
      eventId={event.id}
      initialItems={event.programme ?? []}
      eventStartDate={event.eventStartDate}
      eventEndDate={event.eventEndDate}
    />
  );
}
